-- ============================================================
-- HobbyHub Complete Schema (Bulletproof - handles any state)
-- Copy ALL of this into ONE new SQL query and click Run
-- ============================================================

-- Step 1: Safely drop everything that might exist
DO $$ BEGIN
  drop table if exists public.messages cascade;
  drop table if exists public.conversations cascade;
  drop table if exists public.notifications cascade;
  drop table if exists public.user_activity cascade;
  drop table if exists public.subcommittee_joins cascade;
  drop table if exists public.friend_requests cascade;
  drop table if exists public.posts cascade;
  drop table if exists public.profiles cascade;
  drop trigger if exists on_auth_user_created on auth.users;
  drop function if exists public.handle_new_user();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Cleanup error (safe to ignore): %', SQLERRM;
END $$;

-- Step 2: Create tables
-- ============================================================

-- PROFILES
CREATE TABLE public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  username text unique not null,
  email text not null,
  avatar text default 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
  clan_name text,
  bio text,
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- POSTS
CREATE TABLE public.posts (
  id uuid default gen_random_uuid() primary key,
  community_id text not null,
  community_tag text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_name text not null,
  avatar text,
  clan_name text,
  title text,
  content text not null,
  image text,
  liked_by uuid[] default '{}',
  saved_by uuid[] default '{}',
  reported_by uuid[] default '{}',
  comments jsonb default '[]',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- FRIEND REQUESTS
CREATE TABLE public.friend_requests (
  id uuid default gen_random_uuid() primary key,
  from_user_id uuid references auth.users(id) on delete cascade not null,
  from_user_name text not null,
  from_user_avatar text,
  to_user_id uuid references auth.users(id) on delete cascade not null,
  to_user_name text not null,
  to_user_avatar text,
  status text not null check (status in ('pending', 'accepted', 'declined')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(from_user_id, to_user_id)
);

-- SUBCOMMITTEE JOINS
CREATE TABLE public.subcommittee_joins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  subcommittee_id text not null,
  community_id text not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, subcommittee_id)
);

-- CONVERSATIONS
CREATE TABLE public.conversations (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('direct', 'group')),
  name text not null,
  participant_ids uuid[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- MESSAGES
CREATE TABLE public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  sender_name text not null,
  sender_avatar text,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('like', 'comment', 'follow', 'mention', 'report', 'message')),
  title text not null,
  message text not null,
  from_user_id uuid,
  from_user_name text,
  from_user_avatar text,
  to_user_id uuid references auth.users(id) on delete cascade not null,
  link text,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- USER ACTIVITY
CREATE TABLE public.user_activity (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  user_name text not null,
  user_avatar text,
  last_seen timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Step 3: Enable RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.friend_requests enable row level security;
alter table public.subcommittee_joins enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.user_activity enable row level security;

-- Step 4: RLS Policies (wrapped in DO blocks for safety)
-- ============================================================

DO $$ BEGIN
  create policy "Anyone can read profiles" on public.profiles for select using (true);
  create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
  create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Profiles policies already exist'; END $$;

DO $$ BEGIN
  create policy "Anyone can read posts" on public.posts for select using (true);
  create policy "Authenticated users can create posts" on public.posts for insert with check (auth.uid() = user_id);
  create policy "Users can update own posts" on public.posts for update using (auth.uid() = user_id);
  create policy "Users can delete own posts" on public.posts for delete using (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Posts policies already exist'; END $$;

DO $$ BEGIN
  create policy "Users can see requests they sent or received" on public.friend_requests for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);
  create policy "Authenticated users can send requests" on public.friend_requests for insert with check (auth.uid() = from_user_id);
  create policy "Users can update requests" on public.friend_requests for update using (auth.uid() = from_user_id or auth.uid() = to_user_id);
  create policy "Users can delete requests" on public.friend_requests for delete using (auth.uid() = from_user_id or auth.uid() = to_user_id);
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Friend request policies already exist'; END $$;

DO $$ BEGIN
  create policy "Anyone can read joins" on public.subcommittee_joins for select using (true);
  create policy "Users can join subcommittees" on public.subcommittee_joins for insert with check (auth.uid() = user_id);
  create policy "Users can leave subcommittees" on public.subcommittee_joins for delete using (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Joins policies already exist'; END $$;

DO $$ BEGIN
  create policy "Participants can read conversations" on public.conversations for select using (auth.uid() = any(participant_ids));
  create policy "Participants can create conversations" on public.conversations for insert with check (auth.uid() = any(participant_ids));
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Conversation policies already exist'; END $$;

DO $$ BEGIN
  create policy "Participants can read messages" on public.messages for select using (auth.uid() = any((select participant_ids from public.conversations where id = messages.conversation_id)));
  create policy "Participants can send messages" on public.messages for insert with check (auth.uid() = any((select participant_ids from public.conversations where id = messages.conversation_id)));
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Message policies already exist'; END $$;

DO $$ BEGIN
  create policy "Users can read own notifications" on public.notifications for select using (auth.uid() = to_user_id);
  create policy "Anyone can create notifications" on public.notifications for insert with check (true);
  create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = to_user_id);
  create policy "Users can delete own notifications" on public.notifications for delete using (auth.uid() = to_user_id);
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Notification policies already exist'; END $$;

DO $$ BEGIN
  create policy "Anyone can read activity" on public.user_activity for select using (true);
  create policy "Users can upsert own activity" on public.user_activity for insert with check (auth.uid() = user_id);
  create policy "Users can update own activity" on public.user_activity for update using (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Activity policies already exist'; END $$;

-- Step 5: Enable Realtime
-- ============================================================
DO $$ BEGIN
  alter publication supabase_realtime add table public.posts;
  alter publication supabase_realtime add table public.friend_requests;
  alter publication supabase_realtime add table public.subcommittee_joins;
  alter publication supabase_realtime add table public.conversations;
  alter publication supabase_realtime add table public.messages;
  alter publication supabase_realtime add table public.notifications;
  alter publication supabase_realtime add table public.user_activity;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Realtime setup error (may already be configured): %', SQLERRM;
END $$;

-- Step 6: Indexes
-- ============================================================
create index if not exists idx_posts_community on public.posts(community_id);
create index if not exists idx_posts_user on public.posts(user_id);
create index if not exists idx_posts_created on public.posts(created_at desc);
create index if not exists idx_friend_req_from on public.friend_requests(from_user_id);
create index if not exists idx_friend_req_to on public.friend_requests(to_user_id);
create index if not exists idx_friend_req_status on public.friend_requests(status);
create index if not exists idx_subjoins_user on public.subcommittee_joins(user_id);
create index if not exists idx_subjoins_sub on public.subcommittee_joins(subcommittee_id);
create index if not exists idx_messages_conv on public.messages(conversation_id);
create index if not exists idx_notifs_user on public.notifications(to_user_id);
create index if not exists idx_activity_lastseen on public.user_activity(last_seen desc);

-- Step 7: Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, username, email, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    case when new.email = 'roninonedigital@gmail.com' then true else false end
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

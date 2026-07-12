/**
 * Supabase Configuration
 * ======================
 *
 * INSTRUCTIONS:
 * 1. Go to https://supabase.com/ and create a new project.
 * 2. Copy your Project URL and Anon Key from Settings > API.
 * 3. Replace the placeholder values below.
 * 4. Enable Email provider in Authentication > Providers.
 * 5. Create the database tables using the SQL below.
 *
 * For push notifications:
 * 6. Create an Edge Function at supabase/functions/push-notify
 * 7. Use FCM server key (Android) or APNs cert (iOS) in the function
 */

import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';

/* ─── PLACEHOLDER CONFIG ─── Replace with your actual Supabase project credentials */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rfwqlnbvojzqzhiagxhl.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_lx3WOSNbEzH867xgIYXSsw_Xph6lbJJ';

export const hasRealConfig = !SUPABASE_URL.includes('YOUR_') && !SUPABASE_ANON_KEY.includes('YOUR_');

/* ─── Client ─── */
export const supabase: SupabaseClient | null = hasRealConfig
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

export type TypedSupabaseClient = SupabaseClient;
export type { RealtimeChannel };

/* ═══════════════════════════════════════════
   DATABASE SETUP SQL — Run in Supabase SQL Editor
   ═══════════════════════════════════════════

-- Enable Realtime for tables
begin;
  -- Profiles table (extends auth.users)
  create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    name text not null,
    username text unique not null,
    email text not null,
    avatar text default '/avatar-1.jpg',
    clan_name text,
    bio text,
    fcm_token text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
  );

  -- Conversations table
  create table if not exists public.conversations (
    id uuid default gen_random_uuid() primary key,
    type text not null check (type in ('direct', 'group')),
    name text not null,
    participant_ids uuid[] not null,
    last_message jsonb,
    unread_map jsonb default '{}',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
  );

  -- Messages table
  create table if not exists public.messages (
    id uuid default gen_random_uuid() primary key,
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    sender_id uuid references auth.users(id) on delete cascade not null,
    sender_name text not null,
    sender_avatar text,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
  );

  -- Notifications table
  create table if not exists public.notifications (
    id uuid default gen_random_uuid() primary key,
    type text not null check (type in ('like', 'comment', 'follow', 'mention', 'report', 'message')),
    title text not null,
    message text not null,
    from_user text not null,
    from_avatar text default '/avatar-1.jpg',
    to_user uuid references auth.users(id) on delete cascade not null,
    link text,
    read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
  );

  -- Posts table
  create table if not exists public.posts (
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

  -- Enable Row Level Security
  alter table public.profiles enable row level security;
  alter table public.conversations enable row level security;
  alter table public.messages enable row level security;
  alter table public.notifications enable row level security;
  alter table public.posts enable row level security;

  -- RLS Policies
  create policy "Users can read own profile"
    on public.profiles for select using (auth.uid() = id);
  create policy "Users can update own profile"
    on public.profiles for update using (auth.uid() = id);
  create policy "Users can insert own profile"
    on public.profiles for insert with check (auth.uid() = id);

  create policy "Participants can read conversation"
    on public.conversations for select using (auth.uid() = any(participant_ids));
  create policy "Participants can create conversation"
    on public.conversations for insert with check (auth.uid() = any(participant_ids));
  create policy "Participants can update conversation"
    on public.conversations for update using (auth.uid() = any(participant_ids));

  create policy "Participants can read messages"
    on public.messages for select using (
      auth.uid() = any(
        (select participant_ids from public.conversations where id = messages.conversation_id)
      )
    );
  create policy "Participants can send messages"
    on public.messages for insert with check (
      auth.uid() = any(
        (select participant_ids from public.conversations where id = messages.conversation_id)
      )
    );

  create policy "Users can read own notifications"
    on public.notifications for select using (auth.uid() = to_user);
  create policy "Anyone can create notifications"
    on public.notifications for insert with check (true);
  create policy "Users can update own notifications"
    on public.notifications for update using (auth.uid() = to_user);

  create policy "Anyone can read posts"
    on public.posts for select using (true);
  create policy "Authenticated users can create posts"
    on public.posts for insert with check (auth.uid() = user_id);
  create policy "Authenticated users can update posts"
    on public.posts for update using (auth.uid() = user_id);

  -- Enable Realtime for all tables
  alter publication supabase_realtime add table public.conversations;
  alter publication supabase_realtime add table public.messages;
  alter publication supabase_realtime add table public.notifications;
  alter publication supabase_realtime add table public.posts;
commit;

*/

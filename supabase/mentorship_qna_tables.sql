-- Q&A questions. Answers are stored as a JSONB array on the row itself,
-- mirroring how public.posts stores its `comments` column.
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id TEXT NOT NULL,
  subcommittee_id TEXT,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]',
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS questions_community_id_idx ON public.questions (community_id);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read questions" ON public.questions FOR SELECT USING (true);

CREATE POLICY "Authenticated can ask questions" ON public.questions FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid()::text);

-- Any authenticated user needs to be able to update a question's `answers`
-- array to post an answer (not just the original asker), and the asker
-- needs to be able to mark an answer accepted. There's no separate
-- answers table to scope this more tightly against, so this mirrors the
-- same trusting-client-payload model the app already uses for post
-- comments.
CREATE POLICY "Authenticated can answer or resolve questions" ON public.questions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authors can delete their questions" ON public.questions FOR DELETE TO authenticated USING (author_id = auth.uid()::text);

-- Mentor opt-ins, scoped per subcommittee.
CREATE TABLE IF NOT EXISTS public.mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  community_id TEXT NOT NULL,
  subcommittee_id TEXT NOT NULL,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, subcommittee_id)
);

CREATE INDEX IF NOT EXISTS mentors_community_id_idx ON public.mentors (community_id);

ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read mentors" ON public.mentors FOR SELECT USING (true);

CREATE POLICY "Authenticated can become a mentor" ON public.mentors FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Mentors can update their own listing" ON public.mentors FOR UPDATE TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "Mentors can remove themselves" ON public.mentors FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- Project tracker: replaces the old static "Builds" mock data with a
-- real, ownable project log. Progress updates are stored as a JSONB
-- array on the row, same pattern as posts.comments / questions.answers.
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id TEXT NOT NULL,
  subcommittee_id TEXT,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning', -- 'planning' | 'in_progress' | 'done'
  cover_image TEXT,
  updates JSONB NOT NULL DEFAULT '[]',
  reported_by TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_community_id_idx ON public.projects (community_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read projects" ON public.projects FOR SELECT USING (true);

CREATE POLICY "Authenticated can start projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid()::text);

-- Broad on purpose: reporting needs to work for users other than the
-- author, same trade-off as wiki_articles/questions.
CREATE POLICY "Authenticated can update projects" ON public.projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authors and admins can delete projects" ON public.projects FOR DELETE TO authenticated USING (
  author_id = auth.uid()::text OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

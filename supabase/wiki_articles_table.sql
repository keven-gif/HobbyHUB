CREATE TABLE IF NOT EXISTS public.wiki_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id TEXT NOT NULL,
  subcommittee_id TEXT,
  category TEXT NOT NULL DEFAULT 'guide',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  reported_by TEXT[] NOT NULL DEFAULT '{}',
  upvoted_by TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wiki_articles_community_id_idx ON public.wiki_articles (community_id);

ALTER TABLE public.wiki_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read wiki articles" ON public.wiki_articles FOR SELECT USING (true);

CREATE POLICY "Authenticated can create wiki articles" ON public.wiki_articles FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid()::text);

-- Broad on purpose: reporting and upvoting need to work for users other
-- than the author, same as posts (see fix_likes_rls_v2.sql). The app's
-- own UI is what keeps editing scoped to the author.
CREATE POLICY "Authenticated can update wiki articles" ON public.wiki_articles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authors and admins can delete wiki articles" ON public.wiki_articles FOR DELETE TO authenticated USING (
  author_id = auth.uid()::text OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

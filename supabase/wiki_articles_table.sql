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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wiki_articles_community_id_idx ON public.wiki_articles (community_id);

ALTER TABLE public.wiki_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read wiki articles" ON public.wiki_articles FOR SELECT USING (true);

CREATE POLICY "Authenticated can create wiki articles" ON public.wiki_articles FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid()::text);

CREATE POLICY "Authors can update their wiki articles" ON public.wiki_articles FOR UPDATE TO authenticated USING (author_id = auth.uid()::text);

CREATE POLICY "Authors can delete their wiki articles" ON public.wiki_articles FOR DELETE TO authenticated USING (author_id = auth.uid()::text);

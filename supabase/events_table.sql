CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  time TEXT,
  location TEXT,
  created_by TEXT NOT NULL,
  creator_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read events" ON public.events FOR SELECT USING (true);

CREATE POLICY "Authenticated can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Creators can delete events" ON public.events FOR DELETE TO authenticated USING (created_by = auth.uid()::text);

-- "From the founder" dev journal, visible to everyone, postable only by
-- the app's admin account (checked via profiles.is_admin, the same flag
-- AuthContext already sets for the hardcoded admin email on login).
CREATE TABLE IF NOT EXISTS public.founder_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.founder_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read founder updates" ON public.founder_updates FOR SELECT USING (true);

CREATE POLICY "Only admins can post founder updates" ON public.founder_updates FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Only admins can delete founder updates" ON public.founder_updates FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

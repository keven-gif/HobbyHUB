-- ============================================================
-- Subcommittee Joins Table
-- Tracks which users joined which subcommittees
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subcommittee_joins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  subcommittee_id TEXT NOT NULL,
  community_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, subcommittee_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_subcommittee_joins_user ON public.subcommittee_joins(user_id);
CREATE INDEX IF NOT EXISTS idx_subcommittee_joins_sub ON public.subcommittee_joins(subcommittee_id);
CREATE INDEX IF NOT EXISTS idx_subcommittee_joins_community ON public.subcommittee_joins(community_id);

-- RLS policies
ALTER TABLE public.subcommittee_joins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all joins" ON public.subcommittee_joins
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own joins" ON public.subcommittee_joins
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can delete own joins" ON public.subcommittee_joins
  FOR DELETE TO authenticated USING (true);

-- Enable realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'subcommittee_joins') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subcommittee_joins;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

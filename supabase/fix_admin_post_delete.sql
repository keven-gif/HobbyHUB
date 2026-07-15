-- The existing "Users can delete own posts" policy only lets the post's
-- author delete it, so an admin removing someone ELSE's flagged post from
-- the moderation queue was silently blocked by RLS. This adds a second,
-- additive policy (Postgres OR's multiple permissive policies together)
-- so admins can also delete any post, without touching the existing
-- owner policy.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'posts'
    AND policyname = 'Admins can delete any post'
  ) THEN
    CREATE POLICY "Admins can delete any post" ON public.posts
      FOR DELETE
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

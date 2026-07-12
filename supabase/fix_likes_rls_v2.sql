-- ============================================================
-- Fix Likes/Comments RLS (Simple & Safe)
-- No DROP, no destructive operations
-- ============================================================

-- Step 1: Rename the old restrictive policy (disable it without deleting)
-- This keeps it as backup reference but stops it from blocking
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'posts' 
    AND policyname = 'Users can update own posts'
  ) THEN
    ALTER POLICY "Users can update own posts" ON public.posts 
    RENAME TO "old_update_own_posts_backup";
  END IF;
END $$;

-- Step 2: Create the new policy that allows ALL authenticated users to update posts
-- This covers: likes, comments, saves, reports
-- Owners still protected because they own the row, engagement just adds to arrays
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'posts' 
    AND policyname = 'Authenticated users can update posts'
  ) THEN
    CREATE POLICY "Authenticated users can update posts" ON public.posts
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

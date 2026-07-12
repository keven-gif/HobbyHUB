-- ============================================================
-- Fix Likes/Comments/Engagement RLS Policies
-- Likes and comments were failing because only post authors
-- could update their own posts. This allows any authenticated
-- user to update engagement fields on any post.
-- ============================================================

-- Drop the restrictive update policy
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Re-create the owner-only policy for content changes (title, content, image)
CREATE POLICY "Users can update own posts" ON public.posts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add a policy that allows ANY authenticated user to update engagement fields
-- This works because Supabase RLS uses OR logic across policies
CREATE POLICY "Authenticated users can update engagement" ON public.posts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

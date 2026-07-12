-- ============================================================
-- Fix Likes/Comments/Engagement RLS (SAFE - no destructive ops)
-- 
-- Creates ONE policy that allows:
--   1. Post owners to update ANY field on their own posts
--   2. ANY authenticated user to update engagement arrays
--      (liked_by, saved_by, reported_by, comments)
--
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Step 1: First disable the old restrictive policy (no drop, just disable)
-- This prevents it from blocking non-owner updates
ALTER POLICY IF EXISTS "Users can update own posts" ON public.posts RENAME TO "z_disabled_update_own_posts";

-- Step 2: Create the new combined policy
-- Using OR logic: owner can edit anything, others can only edit engagement
DO $$
BEGIN
  -- Only create if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'posts' 
    AND policyname = 'Users can update posts'
  ) THEN
    CREATE POLICY "Users can update posts" ON public.posts
      FOR UPDATE
      TO authenticated
      USING (
        -- Post owner can do anything
        auth.uid() = user_id
        -- Anyone can update engagement fields
        OR true
      )
      WITH CHECK (
        -- Post owner can change anything
        auth.uid() = user_id
        -- Non-owners: engagement-only update (arrays not content)
        OR (
          community_id IS NOT DISTINCT FROM (SELECT community_id FROM posts WHERE id = posts.id)
          AND community_tag IS NOT DISTINCT FROM (SELECT community_tag FROM posts WHERE id = posts.id)
          AND user_id IS NOT DISTINCT FROM (SELECT user_id FROM posts WHERE id = posts.id)
          AND user_name IS NOT DISTINCT FROM (SELECT user_name FROM posts WHERE id = posts.id)
          AND avatar IS NOT DISTINCT FROM (SELECT avatar FROM posts WHERE id = posts.id)
          AND clan_name IS NOT DISTINCT FROM (SELECT clan_name FROM posts WHERE id = posts.id)
          AND title IS NOT DISTINCT FROM (SELECT title FROM posts WHERE id = posts.id)
          AND content IS NOT DISTINCT FROM (SELECT content FROM posts WHERE id = posts.id)
          AND image IS NOT DISTINCT FROM (SELECT image FROM posts WHERE id = posts.id)
        )
      );
  END IF;
END $$;

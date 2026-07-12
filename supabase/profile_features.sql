-- ============================================================
-- Profile Features: Cover Image + Pinned Post
-- ============================================================

-- 1. Add cover_image column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'cover_image'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN cover_image TEXT;
  END IF;
END $$;

-- 2. Add pinned_post_id column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'pinned_post_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN pinned_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL;
  END IF;
END $$;

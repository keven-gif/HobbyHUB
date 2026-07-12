-- ============================================================
-- Username Change Cooldown Migration
-- Adds username_last_changed column to profiles table
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Add the new column (nullable, existing users can change once immediately)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username_last_changed'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username_last_changed timestamp with time zone;
  END IF;
END $$;

-- Update existing profiles: set last_changed to now() so they can change once
UPDATE public.profiles SET username_last_changed = NOW() WHERE username_last_changed IS NULL;

-- Run in Supabase SQL Editor
-- Adds: reach/impressions, timestamp, initial_followers

-- Add reach & posted_at to feedback
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS reach integer DEFAULT 0;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS posted_at timestamptz;

-- Add initial_followers to strategies
ALTER TABLE public.strategies ADD COLUMN IF NOT EXISTS initial_followers integer DEFAULT 0;

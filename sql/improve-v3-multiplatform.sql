-- Run in Supabase SQL Editor
-- Multi-platform support: feedback per platform, followers per platform

-- Add platform to feedback
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS platform text DEFAULT 'instagram';

-- Drop old unique constraint and create new one with platform
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_strategy_id_week_number_day_slot_key;
ALTER TABLE public.feedback ADD CONSTRAINT feedback_strategy_id_week_number_day_slot_platform_key UNIQUE (strategy_id, week_number, day, slot, platform);

-- Change initial_followers from integer to jsonb (per platform)
ALTER TABLE public.strategies ALTER COLUMN initial_followers TYPE jsonb USING jsonb_build_object('instagram', COALESCE(initial_followers, 0));

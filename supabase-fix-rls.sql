-- Run this in Supabase SQL Editor
-- This sets up proper RLS with auth

-- First disable the broken policies
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all access to strategies" ON public.strategies;
DROP POLICY IF EXISTS "Allow all access to weeks" ON public.weeks;
DROP POLICY IF EXISTS "Allow all access to feedback" ON public.feedback;
DROP POLICY IF EXISTS "strategies_select" ON public.strategies;
DROP POLICY IF EXISTS "strategies_insert" ON public.strategies;
DROP POLICY IF EXISTS "strategies_update" ON public.strategies;
DROP POLICY IF EXISTS "strategies_delete" ON public.strategies;
DROP POLICY IF EXISTS "weeks_select" ON public.weeks;
DROP POLICY IF EXISTS "weeks_insert" ON public.weeks;
DROP POLICY IF EXISTS "weeks_update" ON public.weeks;
DROP POLICY IF EXISTS "weeks_delete" ON public.weeks;
DROP POLICY IF EXISTS "feedback_select" ON public.feedback;
DROP POLICY IF EXISTS "feedback_insert" ON public.feedback;
DROP POLICY IF EXISTS "feedback_update" ON public.feedback;
DROP POLICY IF EXISTS "feedback_delete" ON public.feedback;

-- Proper RLS: users can only access their own data
CREATE POLICY "Users can read own strategies"
  ON public.strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategies"
  ON public.strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies"
  ON public.strategies FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies"
  ON public.strategies FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own weeks"
  ON public.weeks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weeks"
  ON public.weeks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weeks"
  ON public.weeks FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
  ON public.feedback FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

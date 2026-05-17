-- Run this in Supabase Dashboard > SQL Editor

-- Strategies table
CREATE TABLE IF NOT EXISTS public.strategies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  niche text NOT NULL,
  platform text NOT NULL,
  audience text NOT NULL,
  message text NOT NULL,
  conversion_goal text NOT NULL,
  tone text DEFAULT '',
  posts_per_day integer DEFAULT 2,
  brand jsonb NOT NULL,
  phases jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Weeks table
CREATE TABLE IF NOT EXISTS public.weeks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  week_number integer NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(strategy_id, week_number)
);

-- Feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  week_number integer NOT NULL,
  day integer NOT NULL,
  slot text NOT NULL,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  messages integer DEFAULT 0,
  conversions integer DEFAULT 0,
  note text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(strategy_id, week_number, day, slot)
);

-- RLS policies (enable row level security)
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- For now, allow all access (no auth yet). Replace with proper policies when auth is added.
CREATE POLICY "Allow all access to strategies" ON public.strategies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to weeks" ON public.weeks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to feedback" ON public.feedback FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON public.strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_weeks_strategy_id ON public.weeks(strategy_id);
CREATE INDEX IF NOT EXISTS idx_feedback_strategy_id ON public.feedback(strategy_id);

-- Run this in Supabase SQL Editor if tables don't exist yet
-- This is the complete schema for Influencer Launchpad

-- Strategies
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

-- Weeks
CREATE TABLE IF NOT EXISTS public.weeks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  week_number integer NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(strategy_id, week_number)
);

-- Feedback
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

-- User Plans
CREATE TABLE IF NOT EXISTS public.user_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  midtrans_order_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Usage Logs
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Policies: users access own data
CREATE POLICY IF NOT EXISTS "own_strategies" ON public.strategies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own_weeks" ON public.weeks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own_feedback" ON public.feedback FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own_plans" ON public.user_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own_usage" ON public.usage_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create plan for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan) VALUES (NEW.id, 'free') ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_plan ON auth.users;
CREATE TRIGGER on_auth_user_created_plan AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_plan();

-- Backfill existing users
INSERT INTO public.user_plans (user_id, plan) SELECT id, 'free' FROM auth.users ON CONFLICT (user_id) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_strategies_user ON public.strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_weeks_strategy ON public.weeks(strategy_id);
CREATE INDEX IF NOT EXISTS idx_feedback_strategy ON public.feedback(strategy_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_action ON public.usage_logs(user_id, action, created_at);

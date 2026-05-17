
-- Strategies (one active per user; we keep the latest)
CREATE TABLE public.strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  niche text NOT NULL,
  platform text NOT NULL,
  audience text NOT NULL,
  message text NOT NULL,
  conversion_goal text NOT NULL,
  tone text NOT NULL DEFAULT '',
  posts_per_day integer NOT NULL DEFAULT 2,
  brand jsonb NOT NULL,
  phases jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX strategies_user_idx ON public.strategies(user_id, created_at DESC);
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own strategies select" ON public.strategies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own strategies insert" ON public.strategies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own strategies update" ON public.strategies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own strategies delete" ON public.strategies FOR DELETE USING (auth.uid() = user_id);

-- Weeks
CREATE TABLE public.weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  week_number integer NOT NULL CHECK (week_number BETWEEN 1 AND 13),
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (strategy_id, week_number)
);
CREATE INDEX weeks_user_idx ON public.weeks(user_id, strategy_id);
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weeks select" ON public.weeks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own weeks insert" ON public.weeks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own weeks update" ON public.weeks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own weeks delete" ON public.weeks FOR DELETE USING (auth.uid() = user_id);

-- Feedback per post
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  day integer NOT NULL,
  slot text NOT NULL,
  likes integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  messages integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (strategy_id, week_number, day, slot)
);
CREATE INDEX feedback_user_idx ON public.feedback(user_id, strategy_id);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feedback select" ON public.feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own feedback insert" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own feedback update" ON public.feedback FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own feedback delete" ON public.feedback FOR DELETE USING (auth.uid() = user_id);

-- Touch updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER strategies_touch BEFORE UPDATE ON public.strategies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER feedback_touch BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

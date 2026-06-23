-- Marketing OS AI features — run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS monthly_marketing_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_month DATE NOT NULL,
  objective TEXT NOT NULL DEFAULT 'leads',
  plan JSONB NOT NULL,
  context_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, plan_month)
);

CREATE TABLE IF NOT EXISTS instagram_funnels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  offer TEXT NOT NULL,
  target_audience TEXT,
  funnel_goal TEXT NOT NULL DEFAULT 'leads',
  funnel JSONB NOT NULL,
  context_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS monthly_marketing_plans_user_month_idx
  ON monthly_marketing_plans(user_id, plan_month DESC);

CREATE INDEX IF NOT EXISTS instagram_funnels_user_created_idx
  ON instagram_funnels(user_id, created_at DESC);

ALTER TABLE monthly_marketing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_funnels ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "monthly_marketing_plans_own" ON monthly_marketing_plans
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "instagram_funnels_own" ON instagram_funnels
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

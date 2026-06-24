-- Audience Finder AI reports — run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS audience_finder_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  niche TEXT NOT NULL,
  goal TEXT NOT NULL DEFAULT 'seguidores cualificados',
  input_snapshot JSONB NOT NULL,
  report JSONB NOT NULL,
  context_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audience_finder_reports_user_created_idx
  ON audience_finder_reports(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audience_finder_reports_user_niche_idx
  ON audience_finder_reports(user_id, niche);

ALTER TABLE audience_finder_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "audience_finder_reports_own" ON audience_finder_reports
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

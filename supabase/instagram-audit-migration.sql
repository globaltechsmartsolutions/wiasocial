-- Instagram Audit Pro — run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS instagram_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instagram_username TEXT NOT NULL,
  input_data JSONB NOT NULL,
  scores JSONB NOT NULL,
  ai_report JSONB,
  growth_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS instagram_audits_user_created_idx
  ON instagram_audits(user_id, created_at DESC);

ALTER TABLE instagram_audits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "audits_own" ON instagram_audits FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Instagram full data — run in Supabase SQL Editor after instagram-migration.sql

ALTER TABLE instagram_connections
  ADD COLUMN IF NOT EXISTS profile_data JSONB,
  ADD COLUMN IF NOT EXISTS account_insights JSONB,
  ADD COLUMN IF NOT EXISTS audience_insights JSONB,
  ADD COLUMN IF NOT EXISTS stories_data JSONB,
  ADD COLUMN IF NOT EXISTS follows_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS instagram_media_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instagram_media_id TEXT NOT NULL,
  media_type TEXT,
  caption TEXT,
  permalink TEXT,
  thumbnail_url TEXT,
  media_url TEXT,
  posted_at TIMESTAMPTZ,
  like_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  insights JSONB DEFAULT '{}',
  comments JSONB DEFAULT '[]',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, instagram_media_id)
);

ALTER TABLE instagram_media_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ig_media_own" ON instagram_media_items FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS ig_media_user_posted_idx ON instagram_media_items(user_id, posted_at DESC);

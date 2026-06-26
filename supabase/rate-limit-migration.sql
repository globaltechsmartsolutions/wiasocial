-- Shared API rate limits for production deployments.
-- Run in Supabase SQL Editor, or via: npm run migrate:rate-limit

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_ms INTEGER
)
RETURNS TABLE(ok BOOLEAN, remaining INTEGER, retry_after INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_ts TIMESTAMPTZ := NOW();
  window_interval INTERVAL := p_window_ms * INTERVAL '1 millisecond';
  current_count INTEGER;
  current_reset_at TIMESTAMPTZ;
BEGIN
  INSERT INTO rate_limits AS rl (key, count, reset_at, updated_at)
  VALUES (p_key, 1, now_ts + window_interval, now_ts)
  ON CONFLICT (key) DO UPDATE
  SET
    count = CASE
      WHEN rl.reset_at <= now_ts THEN 1
      ELSE rl.count + 1
    END,
    reset_at = CASE
      WHEN rl.reset_at <= now_ts THEN now_ts + window_interval
      ELSE rl.reset_at
    END,
    updated_at = now_ts
  RETURNING count, reset_at
  INTO current_count, current_reset_at;

  ok := current_count <= p_limit;
  remaining := GREATEST(p_limit - current_count, 0);
  retry_after := CASE
    WHEN ok THEN 0
    ELSE GREATEST(CEIL(EXTRACT(EPOCH FROM (current_reset_at - now_ts)))::INTEGER, 0)
  END;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

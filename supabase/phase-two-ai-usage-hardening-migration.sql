-- Phase 2: the AI usage counter must be a real spending control.
--
-- Two problems this fixes:
--   1. ai_usage was writable by the account holder (FOR ALL policy + default
--      grants), so anyone could PATCH their own counter back to zero.
--   2. increment_ai_usage incremented first and let the caller decide, so a
--      blocked request still burned a slot and concurrency could overshoot.
--
-- The counter is now written only through the function, which enforces the
-- limit inside the same transaction that increments it.

-- 1. ai_usage becomes read-only for the account holder.
DROP POLICY IF EXISTS "ai_usage_own" ON ai_usage;

DO $$ BEGIN
  CREATE POLICY "ai_usage_select_own" ON ai_usage
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

REVOKE ALL ON ai_usage FROM anon;
REVOKE ALL ON ai_usage FROM authenticated;
GRANT SELECT ON ai_usage TO authenticated;
GRANT ALL ON ai_usage TO service_role;

-- 2. Atomic check-and-increment.
-- SECURITY DEFINER so it can write a table the caller cannot, after verifying
-- the caller is the owner of the record. search_path is pinned on purpose.
DROP FUNCTION IF EXISTS public.increment_ai_usage(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_user_id UUID,
  p_month_key TEXT,
  p_limit INTEGER
)
RETURNS TABLE (used INTEGER, incremented BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to update this usage record';
  END IF;

  IF p_month_key !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Invalid month key';
  END IF;

  IF p_limit IS NULL OR p_limit < 0 THEN
    RAISE EXCEPTION 'Invalid limit';
  END IF;

  INSERT INTO ai_usage (user_id, month_key, count, updated_at)
  VALUES (p_user_id, p_month_key, 0, NOW())
  ON CONFLICT (user_id, month_key) DO NOTHING;

  -- FOR UPDATE serialises concurrent generations for the same user and month.
  SELECT count INTO current_count
  FROM ai_usage
  WHERE user_id = p_user_id AND month_key = p_month_key
  FOR UPDATE;

  IF current_count >= p_limit THEN
    RETURN QUERY SELECT current_count, FALSE;
    RETURN;
  END IF;

  UPDATE ai_usage
  SET count = count + 1, updated_at = NOW()
  WHERE user_id = p_user_id AND month_key = p_month_key
  RETURNING count INTO current_count;

  RETURN QUERY SELECT current_count, TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_ai_usage(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(UUID, TEXT, INTEGER) TO authenticated, service_role;

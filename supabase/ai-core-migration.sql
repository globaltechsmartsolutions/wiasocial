-- AI core: trazabilidad de ejecuciones y cuota reservable (fases P2 de la
-- arquitectura IA 2026).
--
-- 1. generation_runs / generation_steps / usage_events: cada generación
--    migrada se registra en servidor antes y después de llamar al proveedor,
--    de modo que cerrar el navegador no pierde una generación pagada.
-- 2. release_ai_usage: complementa a increment_ai_usage. La cuota se reserva
--    antes de ejecutar y se libera si el proveedor falla, para que un error
--    ajeno al usuario no consuma su cuota.
--
-- Rollback: las tablas son aditivas; el código las trata como best-effort y
-- funciona sin ellas. Para revertir por completo:
--   DROP FUNCTION IF EXISTS public.release_ai_usage(UUID, TEXT);
--   DROP TABLE IF EXISTS usage_events; DROP TABLE IF EXISTS generation_steps;
--   DROP TABLE IF EXISTS generation_runs;

-- ── Tablas ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  prompt_version INTEGER NOT NULL DEFAULT 1,
  model_alias TEXT,
  provider TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  input JSONB,
  result JSONB,
  error_code TEXT,
  error_message TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  estimated_cost_usd NUMERIC(12, 6),
  attempts INTEGER,
  quota_released BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_generation_runs_user_created
  ON generation_runs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS generation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES generation_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'skipped')),
  provider TEXT,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  estimated_cost_usd NUMERIC(12, 6),
  attempts INTEGER,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_generation_steps_run
  ON generation_steps (run_id);

CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id UUID REFERENCES generation_runs(id) ON DELETE SET NULL,
  task_id TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('reserve', 'settle', 'release', 'failure')),
  units INTEGER NOT NULL DEFAULT 1,
  provider TEXT,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost_usd NUMERIC(12, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_created
  ON usage_events (user_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- El titular puede leer y escribir sus propios registros de traza. La cuota
-- real no vive aquí: la protege increment_ai_usage/release_ai_usage con
-- SECURITY DEFINER sobre ai_usage, que sigue siendo de solo lectura.

ALTER TABLE generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "generation_runs_select_own" ON generation_runs
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "generation_runs_insert_own" ON generation_runs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "generation_runs_update_own" ON generation_runs
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "generation_steps_select_own" ON generation_steps
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "generation_steps_insert_own" ON generation_steps
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "generation_steps_update_own" ON generation_steps
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "usage_events_select_own" ON usage_events
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "usage_events_insert_own" ON usage_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- usage_events es un registro contable: sin UPDATE ni DELETE para el titular.

-- ── Liberación de cuota ──────────────────────────────────────────────────────
-- Contraparte de increment_ai_usage: devuelve un slot reservado cuando el
-- proveedor falla. Nunca deja el contador por debajo de cero.

CREATE OR REPLACE FUNCTION public.release_ai_usage(
  p_user_id UUID,
  p_month_key TEXT
)
RETURNS TABLE (used INTEGER)
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

  SELECT count INTO current_count
  FROM ai_usage
  WHERE user_id = p_user_id AND month_key = p_month_key
  FOR UPDATE;

  IF current_count IS NULL THEN
    RETURN QUERY SELECT 0;
    RETURN;
  END IF;

  UPDATE ai_usage
  SET count = GREATEST(count - 1, 0), updated_at = NOW()
  WHERE user_id = p_user_id AND month_key = p_month_key
  RETURNING count INTO current_count;

  RETURN QUERY SELECT current_count;
END;
$$;

REVOKE ALL ON FUNCTION public.release_ai_usage(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_ai_usage(UUID, TEXT) TO authenticated, service_role;

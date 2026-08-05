-- AI core: trazabilidad de ejecuciones y cuota reservable (fases P2 de la
-- arquitectura IA 2026). Revisión 2 tras auditoría:
--
--   1. generation_runs / generation_steps / usage_events son un LEDGER escrito
--      solo por el servidor (service_role). El titular únicamente puede leer
--      sus filas: no puede crear, modificar ni borrar registros contables.
--   2. La cuota usa reservas identificadas (ai_usage_reservations) con máquina
--      de estados reserved -> settled | released. La transición es atómica y
--      una reserva confirmada o liberada no puede volver a liberarse, de modo
--      que liberar jamás puede dejar el contador por debajo de lo consumido.
--   3. generation_steps referencia (run_id, user_id) con FK compuesta y
--      usage_events verifica por trigger que user_id coincide con el dueño
--      del run: no pueden existir filas colgadas de un run ajeno.
--
-- Rollback: las tablas son aditivas; el flujo v2 está detrás de
-- CONTENT_STUDIO_V2 (apagado por defecto). Para revertir por completo:
--   DROP FUNCTION IF EXISTS public.reserve_ai_usage(UUID, TEXT, INTEGER);
--   DROP FUNCTION IF EXISTS public.settle_ai_usage_reservation(UUID, UUID);
--   DROP FUNCTION IF EXISTS public.release_ai_usage_reservation(UUID, UUID);
--   DROP TABLE IF EXISTS ai_usage_reservations;
--   DROP TABLE IF EXISTS usage_events; DROP TABLE IF EXISTS generation_steps;
--   DROP TABLE IF EXISTS generation_runs;

-- Función de la revisión 1: nunca desplegada como definitiva, se retira por
-- permitir liberaciones repetidas sin reserva identificada.
DROP FUNCTION IF EXISTS public.release_ai_usage(UUID, TEXT);

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
  finished_at TIMESTAMPTZ,
  -- Permite FKs compuestas que garantizan que steps/eventos pertenecen al
  -- mismo usuario que el run.
  CONSTRAINT generation_runs_id_user_unique UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_generation_runs_user_created
  ON generation_runs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS generation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
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
  finished_at TIMESTAMPTZ,
  -- El step solo puede colgar de un run del MISMO usuario.
  CONSTRAINT generation_steps_run_owner_fk
    FOREIGN KEY (run_id, user_id)
    REFERENCES generation_runs (id, user_id) ON DELETE CASCADE
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

-- run_id es opcional (ON DELETE SET NULL impide una FK compuesta con user_id
-- NOT NULL), así que la coherencia de propietario se impone por trigger.
CREATE OR REPLACE FUNCTION public.enforce_usage_event_run_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.run_id IS NOT NULL THEN
    PERFORM 1 FROM generation_runs WHERE id = NEW.run_id AND user_id = NEW.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'usage_events.user_id does not match the owner of run %', NEW.run_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS usage_events_run_owner ON usage_events;
CREATE TRIGGER usage_events_run_owner
  BEFORE INSERT OR UPDATE ON usage_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_usage_event_run_owner();

-- ── Reservas de cuota ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_usage_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'settled', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_reservations_user
  ON ai_usage_reservations (user_id, month_key, status);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- El ledger y las reservas se escriben SOLO desde servidor (service_role o
-- funciones SECURITY DEFINER). El titular únicamente puede leer sus filas.

ALTER TABLE generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_reservations ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas de la revisión 1 (permitían escribir al titular).
DROP POLICY IF EXISTS "generation_runs_insert_own" ON generation_runs;
DROP POLICY IF EXISTS "generation_runs_update_own" ON generation_runs;
DROP POLICY IF EXISTS "generation_steps_insert_own" ON generation_steps;
DROP POLICY IF EXISTS "generation_steps_update_own" ON generation_steps;
DROP POLICY IF EXISTS "usage_events_insert_own" ON usage_events;

DO $$ BEGIN
  CREATE POLICY "generation_runs_select_own" ON generation_runs
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "generation_steps_select_own" ON generation_steps
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "usage_events_select_own" ON usage_events
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ai_usage_reservations no es visible para el cliente: el identificador de
-- reserva es una credencial de operación contable. Exponerlo permitiría al
-- titular liberar su propia reserva en vuelo y quedarse con la generación.
-- El usuario ve su consumo agregado en ai_usage, que es lo que necesita.
DROP POLICY IF EXISTS "ai_usage_reservations_select_own" ON ai_usage_reservations;

REVOKE ALL ON generation_runs FROM anon, authenticated;
REVOKE ALL ON generation_steps FROM anon, authenticated;
REVOKE ALL ON usage_events FROM anon, authenticated;
REVOKE ALL ON ai_usage_reservations FROM anon, authenticated;
GRANT SELECT ON generation_runs TO authenticated;
GRANT SELECT ON generation_steps TO authenticated;
GRANT SELECT ON usage_events TO authenticated;
GRANT ALL ON generation_runs TO service_role;
GRANT ALL ON generation_steps TO service_role;
GRANT ALL ON usage_events TO service_role;
GRANT ALL ON ai_usage_reservations TO service_role;

-- ── Funciones de cuota ───────────────────────────────────────────────────────
-- La reserva incrementa el contador y crea una fila identificada en la misma
-- transacción. Liberar exige la transición atómica reserved -> released de ESA
-- fila: repetir la llamada no vuelve a decrementar. Confirmar (settled) cierra
-- la reserva para siempre.
--
-- Las tres funciones son EXCLUSIVAMENTE de servidor (solo service_role): un
-- cliente autenticado que pudiera liberar su propia reserva en vuelo se
-- quedaría con la generación sin consumir cuota. La guarda de identidad se
-- mantiene por defensa en profundidad: si alguna vez las ejecutase un rol con
-- sesión (auth.uid() no nulo), solo podría operar sobre su propio usuario.
-- Para service_role auth.uid() es NULL y p_user_id lo fija el servidor a
-- partir del token ya verificado en la ruta.

CREATE OR REPLACE FUNCTION public.reserve_ai_usage(
  p_user_id UUID,
  p_month_key TEXT,
  p_limit INTEGER
)
RETURNS TABLE (reservation_id UUID, used INTEGER, reserved BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  new_reservation UUID;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
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

  -- FOR UPDATE serialisa generaciones concurrentes del mismo usuario y mes.
  SELECT count INTO current_count
  FROM ai_usage
  WHERE user_id = p_user_id AND month_key = p_month_key
  FOR UPDATE;

  IF current_count >= p_limit THEN
    RETURN QUERY SELECT NULL::UUID, current_count, FALSE;
    RETURN;
  END IF;

  UPDATE ai_usage
  SET count = count + 1, updated_at = NOW()
  WHERE user_id = p_user_id AND month_key = p_month_key
  RETURNING count INTO current_count;

  INSERT INTO ai_usage_reservations (user_id, month_key, status)
  VALUES (p_user_id, p_month_key, 'reserved')
  RETURNING id INTO new_reservation;

  RETURN QUERY SELECT new_reservation, current_count, TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_ai_usage_reservation(
  p_user_id UUID,
  p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to update this usage record';
  END IF;

  UPDATE ai_usage_reservations
  SET status = 'settled', updated_at = NOW()
  WHERE id = p_reservation_id AND user_id = p_user_id AND status = 'reserved';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_ai_usage_reservation(
  p_user_id UUID,
  p_reservation_id UUID
)
RETURNS TABLE (released BOOLEAN, used INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reservation_month TEXT;
  current_count INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to update this usage record';
  END IF;

  -- Transición atómica: solo una llamada puede pasar de reserved a released.
  UPDATE ai_usage_reservations
  SET status = 'released', updated_at = NOW()
  WHERE id = p_reservation_id AND user_id = p_user_id AND status = 'reserved'
  RETURNING month_key INTO reservation_month;

  IF reservation_month IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT count INTO current_count
  FROM ai_usage
  WHERE user_id = p_user_id AND month_key = reservation_month
  FOR UPDATE;

  UPDATE ai_usage
  SET count = GREATEST(count - 1, 0), updated_at = NOW()
  WHERE user_id = p_user_id AND month_key = reservation_month
  RETURNING count INTO current_count;

  RETURN QUERY SELECT TRUE, current_count;
END;
$$;

-- Solo el servidor. Un cliente con permiso de ejecución podría liberar su
-- propia reserva mientras la generación está en vuelo y quedarse con el
-- resultado sin consumir cuota.
REVOKE ALL ON FUNCTION public.reserve_ai_usage(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_ai_usage_reservation(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_ai_usage_reservation(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_usage(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_ai_usage_reservation(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_ai_usage_reservation(UUID, UUID) TO service_role;

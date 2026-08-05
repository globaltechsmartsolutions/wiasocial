import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Persistencia de ejecuciones IA (§10 de la arquitectura). Revisión 2 tras
 * auditoría:
 *
 * - Todas las escrituras usan el cliente service_role: el ledger
 *   (`generation_runs`, `generation_steps`, `usage_events`) es de solo lectura
 *   para el titular y no puede falsificarse desde el navegador.
 * - `createRun` y `completeRun` son ESTRICTOS: si el run no puede registrarse
 *   no se llama al proveedor, y si el resultado no puede persistirse no se
 *   responde con éxito. Fallan con `AIPersistenceError`.
 * - Steps y eventos de uso son observabilidad best-effort: su fallo se
 *   registra en logs pero no invalida una generación ya persistida.
 */

export class AIPersistenceError extends Error {
  constructor(operation: string, detail: string) {
    super(
      `Persistencia de IA no disponible (${operation}): ${detail}. ¿Falta ejecutar 'npm run migrate:ai-core' o configurar SUPABASE_SERVICE_ROLE_KEY?`
    );
    this.name = "AIPersistenceError";
  }
}

interface CreateRunParams {
  userId: string;
  taskId: string;
  promptVersion: number;
  modelAlias: string;
  input: unknown;
}

interface RunUsageMetrics {
  provider?: string;
  model?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number;
  estimatedCostUsd?: number | null;
  attempts?: number;
}

interface CompleteRunParams extends RunUsageMetrics {
  result: unknown;
}

interface FailRunParams extends RunUsageMetrics {
  errorCode: string;
  errorMessage: string;
  quotaReleased: boolean;
}

interface UsageEventParams extends RunUsageMetrics {
  runId: string | null;
  userId: string;
  taskId: string;
  eventType: "reserve" | "settle" | "release" | "failure";
  units: number;
}

interface FinishStepParams extends RunUsageMetrics {
  status: "succeeded" | "failed";
  errorCode?: string;
  errorMessage?: string;
}

export interface RunPersistence {
  /** Estricto: lanza AIPersistenceError si el run no queda registrado. */
  createRun(params: CreateRunParams): Promise<string>;
  /** Estricto: lanza AIPersistenceError si el resultado no queda persistido. */
  completeRun(runId: string, params: CompleteRunParams): Promise<void>;
  failRun(runId: string, params: FailRunParams): Promise<void>;
  createStep(runId: string, userId: string, stepId: string): Promise<string | null>;
  finishStep(stepRowId: string | null, params: FinishStepParams): Promise<void>;
  recordUsageEvent(params: UsageEventParams): Promise<void>;
}

function warn(operation: string, detail: unknown) {
  const message = detail instanceof Error ? detail.message : String(detail);
  console.warn(`[ai-runs] ${operation} falló: ${message}`);
}

function toMessage(detail: unknown): string {
  return detail instanceof Error ? detail.message : String(detail);
}

export function createRunPersistence(client?: SupabaseClient): RunPersistence {
  const getClient = () => client ?? getSupabaseAdmin();

  return {
    async createRun(params) {
      let runId: string | null = null;
      try {
        const { data, error } = await getClient()
          .from("generation_runs")
          .insert({
            user_id: params.userId,
            task_id: params.taskId,
            prompt_version: params.promptVersion,
            model_alias: params.modelAlias,
            status: "running",
            input: params.input ?? null,
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (error) throw error;
        runId = (data?.id as string) ?? null;
      } catch (err) {
        throw new AIPersistenceError("createRun", toMessage(err));
      }
      if (!runId) throw new AIPersistenceError("createRun", "no se obtuvo id del run");
      return runId;
    },

    async completeRun(runId, params) {
      try {
        const { data, error } = await getClient()
          .from("generation_runs")
          .update({
            status: "completed",
            result: params.result ?? null,
            provider: params.provider ?? null,
            model: params.model ?? null,
            input_tokens: params.inputTokens ?? null,
            output_tokens: params.outputTokens ?? null,
            latency_ms: params.latencyMs ?? null,
            estimated_cost_usd: params.estimatedCostUsd ?? null,
            attempts: params.attempts ?? null,
            finished_at: new Date().toISOString(),
          })
          .eq("id", runId)
          .select("id");
        if (error) throw error;
        if (!data || data.length === 0) throw new Error(`el run ${runId} no existe`);
      } catch (err) {
        throw new AIPersistenceError("completeRun", toMessage(err));
      }
    },

    async failRun(runId, params) {
      try {
        const { error } = await getClient()
          .from("generation_runs")
          .update({
            status: "failed",
            error_code: params.errorCode,
            error_message: params.errorMessage.slice(0, 1000),
            provider: params.provider ?? null,
            model: params.model ?? null,
            input_tokens: params.inputTokens ?? null,
            output_tokens: params.outputTokens ?? null,
            latency_ms: params.latencyMs ?? null,
            estimated_cost_usd: params.estimatedCostUsd ?? null,
            attempts: params.attempts ?? null,
            quota_released: params.quotaReleased,
            finished_at: new Date().toISOString(),
          })
          .eq("id", runId);
        if (error) throw error;
      } catch (err) {
        warn("failRun", err);
      }
    },

    async createStep(runId, userId, stepId) {
      try {
        const { data, error } = await getClient()
          .from("generation_steps")
          .insert({
            run_id: runId,
            user_id: userId,
            step_id: stepId,
            status: "running",
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (error) throw error;
        return (data?.id as string) ?? null;
      } catch (err) {
        warn("createStep", err);
        return null;
      }
    },

    async finishStep(stepRowId, params) {
      if (!stepRowId) return;
      try {
        const { error } = await getClient()
          .from("generation_steps")
          .update({
            status: params.status,
            provider: params.provider ?? null,
            model: params.model ?? null,
            input_tokens: params.inputTokens ?? null,
            output_tokens: params.outputTokens ?? null,
            latency_ms: params.latencyMs ?? null,
            estimated_cost_usd: params.estimatedCostUsd ?? null,
            attempts: params.attempts ?? null,
            error_code: params.errorCode ?? null,
            error_message: params.errorMessage?.slice(0, 1000) ?? null,
            finished_at: new Date().toISOString(),
          })
          .eq("id", stepRowId);
        if (error) throw error;
      } catch (err) {
        warn("finishStep", err);
      }
    },

    async recordUsageEvent(params) {
      try {
        const { error } = await getClient().from("usage_events").insert({
          user_id: params.userId,
          run_id: params.runId,
          task_id: params.taskId,
          event_type: params.eventType,
          units: params.units,
          provider: params.provider ?? null,
          model: params.model ?? null,
          input_tokens: params.inputTokens ?? null,
          output_tokens: params.outputTokens ?? null,
          estimated_cost_usd: params.estimatedCostUsd ?? null,
        });
        if (error) throw error;
      } catch (err) {
        warn("recordUsageEvent", err);
      }
    },
  };
}

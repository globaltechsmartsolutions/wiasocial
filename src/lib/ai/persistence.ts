import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseForUser } from "@/lib/supabase-admin";

/**
 * Persistencia de ejecuciones IA en servidor (§10 de la arquitectura).
 *
 * Cada generación migrada crea un `generation_run` antes de llamar al
 * proveedor y guarda el resultado en servidor al terminar, de modo que cerrar
 * el navegador no pierde una generación pagada.
 *
 * Todas las escrituras son best-effort: si las tablas aún no existen (la
 * migración `ai-core` no se ha ejecutado), se registra una advertencia y la
 * generación continúa. La trazabilidad completa exige ejecutar la migración.
 */

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
  createRun(params: CreateRunParams): Promise<string | null>;
  completeRun(runId: string, params: CompleteRunParams): Promise<void>;
  failRun(runId: string, params: FailRunParams): Promise<void>;
  createStep(runId: string | null, userId: string, stepId: string): Promise<string | null>;
  finishStep(stepRowId: string | null, params: FinishStepParams): Promise<void>;
  recordUsageEvent(params: UsageEventParams): Promise<void>;
}

function warn(operation: string, detail: unknown) {
  const message = detail instanceof Error ? detail.message : String(detail);
  console.warn(
    `[ai-runs] ${operation} falló (¿migración ai-core pendiente? ejecuta 'npm run migrate:all'): ${message}`
  );
}

export function createRunPersistence(token: string, client?: SupabaseClient): RunPersistence {
  const getClient = () => client ?? getSupabaseForUser(token);

  return {
    async createRun(params) {
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
        return (data?.id as string) ?? null;
      } catch (err) {
        warn("createRun", err);
        return null;
      }
    },

    async completeRun(runId, params) {
      try {
        const { error } = await getClient()
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
          .eq("id", runId);
        if (error) throw error;
      } catch (err) {
        warn("completeRun", err);
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
      if (!runId) return null;
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

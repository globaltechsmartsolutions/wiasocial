import "server-only";

import type { ZodTypeAny } from "zod";
import type { ModelAlias } from "@/lib/ai/model-aliases";
import {
  contentStudioInputSchema,
  contentStudioOutputSchema,
} from "@/lib/ai/schemas/content-studio";

/**
 * Registro central de tareas IA (§5.1-5.2 de la arquitectura).
 *
 * Cada llamada a un modelo pertenece a una tarea registrada aquí, con sus
 * límites explícitos: tamaño de entrada, tokens de salida, timeout, reintentos,
 * temperatura, contexto permitido y coste en cuota. Ninguna ruta define estos
 * valores por su cuenta.
 */

export type AITaskId =
  | "content"
  | "reel-script"
  | "stories"
  | "hook-analyze"
  | "hashtags"
  | "profile-audit"
  | "calendar"
  | "content-series"
  | "format-adapt"
  | "engagement-plan"
  | "engagement-targets"
  | "best-times"
  | "competitor-analyze"
  | "ai-coach"
  | "daily-brief"
  | "growth-radar"
  | "marketing-plan"
  | "funnel-builder"
  | "audience-finder"
  | "instagram-audit"
  | "lead-iq"
  | "monthly-report"
  | "trend-detector";

/**
 * Secciones de contexto que una tarea puede recibir. `legacy-full` marca las
 * tareas aún no migradas que siguen recibiendo el contexto completo; el
 * objetivo es ir sustituyéndolo por secciones mínimas por tarea.
 */
type ContextSection =
  | "brandSettings"
  | "brandMemory"
  | "growthSignals"
  | "instagramProfile"
  | "legacy-full";

export interface AITaskSpec {
  id: AITaskId;
  description: string;
  modelAlias: ModelAlias;
  promptVersion: number;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  maxAttempts: number;
  /** Límite de caracteres del bloque de datos (entrada + contexto) serializado. */
  maxInputChars: number;
  quotaUnits: number;
  contextPolicy: ContextSection[];
  inputSchema?: ZodTypeAny;
  outputSchema?: ZodTypeAny;
}

function spec(partial: Omit<AITaskSpec, "quotaUnits"> & { quotaUnits?: number }): AITaskSpec {
  return { quotaUnits: 1, ...partial };
}

export const AI_TASK_REGISTRY: Record<AITaskId, AITaskSpec> = {
  content: spec({
    id: "content",
    description: "Content Studio: pack premium de contenido para Instagram",
    modelAlias: "TEXT_PREMIUM_PRIMARY",
    promptVersion: 2,
    temperature: 0.8,
    maxOutputTokens: 8000,
    timeoutMs: 90_000,
    maxAttempts: 2,
    maxInputChars: 24_000,
    contextPolicy: ["brandSettings", "brandMemory", "growthSignals"],
    inputSchema: contentStudioInputSchema,
    outputSchema: contentStudioOutputSchema,
  }),
  "reel-script": spec({
    id: "reel-script",
    description: "Guion de reel con timestamps",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.8,
    maxOutputTokens: 2500,
    timeoutMs: 45_000,
    maxAttempts: 2,
    maxInputChars: 20_000,
    contextPolicy: ["legacy-full"],
  }),
  stories: spec({
    id: "stories",
    description: "Secuencia de 5 stories",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.8,
    maxOutputTokens: 2000,
    timeoutMs: 45_000,
    maxAttempts: 2,
    maxInputChars: 20_000,
    contextPolicy: ["legacy-full"],
  }),
  "hook-analyze": spec({
    id: "hook-analyze",
    description: "Análisis de un hook y variantes",
    modelAlias: "TEXT_ECONOMY_PRIMARY",
    promptVersion: 1,
    temperature: 0.7,
    maxOutputTokens: 1500,
    timeoutMs: 30_000,
    maxAttempts: 2,
    maxInputChars: 12_000,
    contextPolicy: ["legacy-full"],
  }),
  hashtags: spec({
    id: "hashtags",
    description: "Clusters de hashtags con volúmenes estimados",
    modelAlias: "TEXT_ECONOMY_PRIMARY",
    promptVersion: 2,
    temperature: 0.7,
    maxOutputTokens: 2000,
    timeoutMs: 30_000,
    maxAttempts: 2,
    maxInputChars: 12_000,
    contextPolicy: ["legacy-full"],
  }),
  "profile-audit": spec({
    id: "profile-audit",
    description: "Auditoría de perfil de Instagram",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.7,
    maxOutputTokens: 2000,
    timeoutMs: 45_000,
    maxAttempts: 2,
    maxInputChars: 16_000,
    contextPolicy: ["legacy-full"],
  }),
  calendar: spec({
    id: "calendar",
    description: "Calendario de contenido de 7 días",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.8,
    maxOutputTokens: 2500,
    timeoutMs: 45_000,
    maxAttempts: 2,
    maxInputChars: 20_000,
    contextPolicy: ["legacy-full"],
  }),
  "content-series": spec({
    id: "content-series",
    description: "Serie de contenido de 7 días",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.8,
    maxOutputTokens: 2500,
    timeoutMs: 45_000,
    maxAttempts: 2,
    maxInputChars: 20_000,
    contextPolicy: ["legacy-full"],
  }),
  "format-adapt": spec({
    id: "format-adapt",
    description: "Adaptación de un formato viral al nicho",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.8,
    maxOutputTokens: 2500,
    timeoutMs: 45_000,
    maxAttempts: 2,
    maxInputChars: 20_000,
    contextPolicy: ["legacy-full"],
  }),
  "engagement-plan": spec({
    id: "engagement-plan",
    description: "Plan diario de engagement manual",
    modelAlias: "TEXT_ECONOMY_PRIMARY",
    promptVersion: 1,
    temperature: 0.7,
    maxOutputTokens: 1500,
    timeoutMs: 30_000,
    maxAttempts: 2,
    maxInputChars: 12_000,
    contextPolicy: ["legacy-full"],
  }),
  "engagement-targets": spec({
    id: "engagement-targets",
    description: "Arquetipos de cuentas para engagement manual",
    modelAlias: "TEXT_ECONOMY_PRIMARY",
    promptVersion: 1,
    temperature: 0.7,
    maxOutputTokens: 1500,
    timeoutMs: 30_000,
    maxAttempts: 2,
    maxInputChars: 12_000,
    contextPolicy: ["legacy-full"],
  }),
  "best-times": spec({
    id: "best-times",
    description: "Mejores horas de publicación",
    modelAlias: "TEXT_ECONOMY_PRIMARY",
    promptVersion: 1,
    temperature: 0.6,
    maxOutputTokens: 1500,
    timeoutMs: 30_000,
    maxAttempts: 2,
    maxInputChars: 16_000,
    contextPolicy: ["legacy-full"],
  }),
  "competitor-analyze": spec({
    id: "competitor-analyze",
    description: "Análisis estratégico de competidor (estimaciones)",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.7,
    maxOutputTokens: 2000,
    timeoutMs: 45_000,
    maxAttempts: 2,
    maxInputChars: 16_000,
    contextPolicy: ["legacy-full"],
  }),
  "ai-coach": spec({
    id: "ai-coach",
    description: "Chat de coaching de marketing",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.7,
    maxOutputTokens: 1200,
    timeoutMs: 45_000,
    maxAttempts: 2,
    maxInputChars: 24_000,
    contextPolicy: ["legacy-full"],
  }),
  "daily-brief": spec({
    id: "daily-brief",
    description: "Brief diario personalizado",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.75,
    maxOutputTokens: 2000,
    timeoutMs: 45_000,
    maxAttempts: 2,
    maxInputChars: 20_000,
    contextPolicy: ["legacy-full"],
  }),
  "growth-radar": spec({
    id: "growth-radar",
    description: "Informe semanal de oportunidades de crecimiento",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.7,
    maxOutputTokens: 5000,
    timeoutMs: 60_000,
    maxAttempts: 2,
    maxInputChars: 24_000,
    contextPolicy: ["legacy-full"],
  }),
  "marketing-plan": spec({
    id: "marketing-plan",
    description: "Plan de marketing mensual",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.7,
    maxOutputTokens: 6000,
    timeoutMs: 60_000,
    maxAttempts: 2,
    maxInputChars: 24_000,
    contextPolicy: ["legacy-full"],
  }),
  "funnel-builder": spec({
    id: "funnel-builder",
    description: "Embudo de conversión para Instagram",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.7,
    maxOutputTokens: 5000,
    timeoutMs: 60_000,
    maxAttempts: 2,
    maxInputChars: 20_000,
    contextPolicy: ["legacy-full"],
  }),
  "audience-finder": spec({
    id: "audience-finder",
    description: "Informe de audiencia objetivo",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.7,
    maxOutputTokens: 5000,
    timeoutMs: 60_000,
    maxAttempts: 2,
    maxInputChars: 20_000,
    contextPolicy: ["legacy-full"],
  }),
  "instagram-audit": spec({
    id: "instagram-audit",
    description: "Auditoría profunda de cuenta de Instagram",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.6,
    maxOutputTokens: 5000,
    timeoutMs: 60_000,
    maxAttempts: 2,
    maxInputChars: 28_000,
    contextPolicy: ["legacy-full"],
  }),
  "lead-iq": spec({
    id: "lead-iq",
    description: "Puntuación y siguiente acción para un lead",
    modelAlias: "TEXT_ECONOMY_PRIMARY",
    promptVersion: 1,
    temperature: 0.4,
    maxOutputTokens: 1200,
    timeoutMs: 30_000,
    maxAttempts: 2,
    maxInputChars: 12_000,
    contextPolicy: ["legacy-full"],
  }),
  "monthly-report": spec({
    id: "monthly-report",
    description: "Informe ejecutivo mensual",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 1,
    temperature: 0.6,
    maxOutputTokens: 5000,
    timeoutMs: 60_000,
    maxAttempts: 2,
    maxInputChars: 24_000,
    contextPolicy: ["legacy-full"],
  }),
  "trend-detector": spec({
    id: "trend-detector",
    description: "Oportunidades de contenido por nicho (sin fuente en tiempo real)",
    modelAlias: "TEXT_STANDARD_PRIMARY",
    promptVersion: 2,
    temperature: 0.8,
    maxOutputTokens: 3000,
    timeoutMs: 45_000,
    maxAttempts: 2,
    maxInputChars: 20_000,
    contextPolicy: ["legacy-full"],
  }),
};

export function getTaskSpec(id: AITaskId): AITaskSpec {
  const found = AI_TASK_REGISTRY[id];
  if (!found) throw new Error(`Tarea IA no registrada: ${id}`);
  return found;
}

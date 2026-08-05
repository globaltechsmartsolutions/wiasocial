import "server-only";

/**
 * Alias lógicos de modelos (§7.1 de la arquitectura). Las rutas y tareas
 * declaran una capacidad, nunca un modelo concreto. El mapeo alias → modelo
 * vive solo aquí y se puede cambiar por variable de entorno sin tocar código.
 */
export type ModelAlias =
  | "TEXT_PREMIUM_PRIMARY"
  | "TEXT_STANDARD_PRIMARY"
  | "TEXT_ECONOMY_PRIMARY";

interface AliasConfig {
  /** Variable de entorno que puede sobreescribir el modelo homologado. */
  envVar: string;
  /** Variables antiguas aceptadas por compatibilidad. */
  legacyEnvVars?: string[];
  /** Modelo homologado por defecto. */
  fallback: string;
}

const ALIAS_CONFIG: Record<ModelAlias, AliasConfig> = {
  TEXT_PREMIUM_PRIMARY: {
    envVar: "AI_MODEL_TEXT_PREMIUM",
    legacyEnvVars: ["CONTENT_STUDIO_OPENAI_MODEL", "CONTENT_STUDIO_PREMIUM_MODEL"],
    fallback: "gpt-4o-mini",
  },
  TEXT_STANDARD_PRIMARY: {
    envVar: "AI_MODEL_TEXT_STANDARD",
    fallback: "gpt-4o-mini",
  },
  TEXT_ECONOMY_PRIMARY: {
    envVar: "AI_MODEL_TEXT_ECONOMY",
    fallback: "gpt-4o-mini",
  },
};

export function resolveModel(alias: ModelAlias): string {
  const config = ALIAS_CONFIG[alias];
  const candidates = [config.envVar, ...(config.legacyEnvVars ?? [])];
  for (const envVar of candidates) {
    const value = process.env[envVar]?.trim();
    if (value) return value;
  }
  return config.fallback;
}

/**
 * Precios de catálogo en USD por millón de tokens. Son ESTIMACIONES para
 * observabilidad interna, no facturación: se registran junto a cada ejecución
 * y se contrastan con la factura real del proveedor.
 */
const MODEL_PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
};

export function estimateCostUsd(
  model: string,
  inputTokens: number | null,
  outputTokens: number | null
): number | null {
  const pricing = MODEL_PRICING_PER_MILLION[model];
  if (!pricing || inputTokens === null || outputTokens === null) return null;
  const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

import "server-only";

import { openai, isOpenAIConfigured } from "@/lib/openai";
import { estimateCostUsd, resolveModel, type ModelAlias } from "@/lib/ai/model-aliases";

/**
 * ModelGateway: única puerta de salida hacia proveedores de IA.
 *
 * - OpenAI es el primer adaptador; añadir otro proveedor significa añadir un
 *   adaptador aquí, no tocar las rutas.
 * - Errores normalizados (`AIGatewayError`) con código estable.
 * - Registra tokens, latencia, modelo, proveedor y coste estimado por llamada.
 * - `store: false` siempre: no se almacenan las respuestas en el proveedor.
 */

export type AIErrorCode =
  | "not_configured"
  | "auth"
  | "rate_limit"
  | "timeout"
  | "invalid_output"
  | "provider_error";

export class AIGatewayError extends Error {
  code: AIErrorCode;
  provider: string;
  status?: number;
  retryable: boolean;

  constructor(
    code: AIErrorCode,
    message: string,
    options: { provider?: string; status?: number; retryable?: boolean } = {}
  ) {
    super(message);
    this.name = "AIGatewayError";
    this.code = code;
    this.provider = options.provider ?? "openai";
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

type GatewayResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; name: string; schema: Record<string, unknown> };

export interface GatewayMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GatewayRequest {
  taskId: string;
  modelAlias: ModelAlias;
  system: string;
  messages: GatewayMessage[];
  maxOutputTokens: number;
  timeoutMs: number;
  maxAttempts: number;
  temperature?: number;
  responseFormat?: GatewayResponseFormat;
  /** Solo para compatibilidad con overrides antiguos por ruta. */
  modelOverride?: string;
}

export interface GatewayResult {
  /** Objeto parseado cuando el formato es JSON; null en formato texto. */
  json: unknown;
  text: string;
  provider: string;
  model: string;
  modelAlias: ModelAlias;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  estimatedCostUsd: number | null;
  attempts: number;
}

interface OpenAICompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** Superficie mínima del cliente OpenAI, para poder inyectar dobles en tests. */
export interface OpenAIChatLike {
  chat: {
    completions: {
      create(
        body: Record<string, unknown>,
        options: { timeout: number; maxRetries: number }
      ): Promise<OpenAICompletionResponse>;
    };
  };
}

export interface ModelGateway {
  generate(request: GatewayRequest): Promise<GatewayResult>;
}

interface GatewayDependencies {
  client?: OpenAIChatLike;
  isConfigured?: () => boolean;
  sleep?: (ms: number) => Promise<void>;
  log?: (entry: Record<string, unknown>) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function normalizeError(err: unknown): AIGatewayError {
  if (err instanceof AIGatewayError) return err;

  const status =
    err && typeof err === "object" && "status" in err && typeof err.status === "number"
      ? err.status
      : undefined;
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err);

  if (name.includes("Timeout") || name === "AbortError" || /timed? ?out/i.test(message)) {
    return new AIGatewayError("timeout", `Timeout del proveedor: ${message}`, { retryable: true });
  }
  if (status === 401 || status === 403) {
    return new AIGatewayError("auth", "Credenciales del proveedor inválidas o sin permisos", {
      status,
      retryable: false,
    });
  }
  if (status === 429) {
    return new AIGatewayError("rate_limit", "Límite de peticiones del proveedor alcanzado", {
      status,
      retryable: true,
    });
  }
  if (status !== undefined && status >= 500) {
    return new AIGatewayError("provider_error", `Error del proveedor (HTTP ${status})`, {
      status,
      retryable: true,
    });
  }
  return new AIGatewayError("provider_error", message, { status, retryable: false });
}

function buildResponseFormat(format: GatewayResponseFormat): Record<string, unknown> | undefined {
  if (format.type === "text") return undefined;
  if (format.type === "json_object") return { type: "json_object" };
  return {
    type: "json_schema",
    json_schema: { name: format.name, strict: true, schema: format.schema },
  };
}

export function createModelGateway(deps: GatewayDependencies = {}): ModelGateway {
  const client: OpenAIChatLike = deps.client ?? (openai as unknown as OpenAIChatLike);
  const isConfigured = deps.isConfigured ?? isOpenAIConfigured;
  const sleep = deps.sleep ?? defaultSleep;
  const log =
    deps.log ??
    ((entry: Record<string, unknown>) => {
      console.info(`[ai-gateway] ${JSON.stringify(entry)}`);
    });

  return {
    async generate(request: GatewayRequest): Promise<GatewayResult> {
      if (!isConfigured()) {
        throw new AIGatewayError("not_configured", "OPENAI_API_KEY no está configurada");
      }

      const model = request.modelOverride?.trim() || resolveModel(request.modelAlias);
      const format = request.responseFormat ?? { type: "json_object" as const };
      const responseFormat = buildResponseFormat(format);
      const startedAt = Date.now();
      let lastError: AIGatewayError | null = null;

      for (let attempt = 1; attempt <= Math.max(1, request.maxAttempts); attempt += 1) {
        const attemptStartedAt = Date.now();
        try {
          const body: Record<string, unknown> = {
            model,
            messages: [
              { role: "system", content: request.system },
              ...request.messages,
            ],
            max_tokens: request.maxOutputTokens,
            // Nunca almacenar prompts/respuestas en el proveedor. Si algún día
            // hiciera falta, debe documentarse la razón junto a este flag.
            store: false,
          };
          if (request.temperature !== undefined) body.temperature = request.temperature;
          if (responseFormat) body.response_format = responseFormat;

          const completion = await client.chat.completions.create(body, {
            timeout: request.timeoutMs,
            maxRetries: 0,
          });

          const text = completion.choices?.[0]?.message?.content ?? "";
          if (!text.trim()) {
            throw new AIGatewayError("invalid_output", "El proveedor devolvió una respuesta vacía", {
              retryable: true,
            });
          }

          let json: unknown = null;
          if (format.type !== "text") {
            try {
              json = JSON.parse(text);
            } catch {
              throw new AIGatewayError(
                "invalid_output",
                "El proveedor devolvió JSON inválido o incompleto",
                { retryable: true }
              );
            }
          }

          const inputTokens = completion.usage?.prompt_tokens ?? null;
          const outputTokens = completion.usage?.completion_tokens ?? null;
          const latencyMs = Date.now() - startedAt;
          const estimatedCost = estimateCostUsd(model, inputTokens, outputTokens);

          log({
            task: request.taskId,
            provider: "openai",
            model,
            modelAlias: request.modelAlias,
            ok: true,
            attempts: attempt,
            inputTokens,
            outputTokens,
            latencyMs,
            estimatedCostUsd: estimatedCost,
          });

          return {
            json,
            text,
            provider: "openai",
            model,
            modelAlias: request.modelAlias,
            inputTokens,
            outputTokens,
            latencyMs,
            estimatedCostUsd: estimatedCost,
            attempts: attempt,
          };
        } catch (err) {
          lastError = normalizeError(err);
          const attemptLatency = Date.now() - attemptStartedAt;
          log({
            task: request.taskId,
            provider: "openai",
            model,
            modelAlias: request.modelAlias,
            ok: false,
            attempt,
            errorCode: lastError.code,
            latencyMs: attemptLatency,
          });
          if (!lastError.retryable || attempt >= request.maxAttempts) break;
          await sleep(Math.min(500 * attempt, 2000));
        }
      }

      throw lastError ?? new AIGatewayError("provider_error", "Fallo desconocido del proveedor");
    },
  };
}

let sharedGateway: ModelGateway | null = null;

export function getModelGateway(): ModelGateway {
  if (!sharedGateway) sharedGateway = createModelGateway();
  return sharedGateway;
}

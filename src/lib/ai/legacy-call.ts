import "server-only";

import { getModelGateway, type ModelGateway } from "@/lib/ai/gateway";
import { getTaskSpec, type AITaskId } from "@/lib/ai/task-registry";
import { buildUserMessage, UNTRUSTED_DATA_POLICY } from "@/lib/ai/untrusted";

/**
 * Punto de entrada P0 para las rutas aún no migradas al núcleo completo.
 *
 * Aplica en un solo sitio: límites por tarea (entrada, salida, timeout,
 * reintentos), `store: false`, delimitación de datos no confiables y errores
 * normalizados. No persiste ejecuciones: eso es exclusivo del flujo migrado.
 */

export class AIInputTooLargeError extends Error {
  constructor(taskId: string, size: number, limit: number) {
    super(
      `La entrada de la tarea ${taskId} supera el límite permitido (${size} > ${limit} caracteres). Reduce el texto e inténtalo de nuevo.`
    );
    this.name = "AIInputTooLargeError";
  }
}

interface LegacyTaskOptions {
  taskId: AITaskId;
  /** Instrucciones de confianza (rol, reglas). Sin datos de usuario. */
  system: string;
  /** Instrucción de la tarea, texto fijo del repositorio sin interpolar datos. */
  instruction: string;
  /**
   * Datos aportados por el usuario en la petición. No confiables. Incluye
   * también el historial de conversación en tareas de chat: los mensajes
   * almacenados son contenido de usuario y NUNCA se reenvían como turnos
   * user/assistant crudos fuera de los delimitadores.
   */
  input?: unknown;
  /** Contexto de la app (Supabase, Instagram, etc.). No confiable. */
  context?: unknown;
  locale?: string;
  mode?: "json" | "text";
  modelOverride?: string;
  gateway?: ModelGateway;
}

function serializeForBudget(value: unknown): string {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Comprueba el tamaño de la entrada ANTES de que la ruta consuma cuota. Sin
 * esto, una entrada demasiado grande gasta una generación del contador mensual
 * sin llegar a llamar al proveedor.
 */
export function assertInputWithinTaskLimit(taskId: AITaskId, input: unknown): void {
  const spec = getTaskSpec(taskId);
  const size = serializeForBudget(input).length;
  if (size > spec.maxInputChars) {
    throw new AIInputTooLargeError(spec.id, size, spec.maxInputChars);
  }
}

export interface ConversationMessage {
  role: string;
  content: string;
}

/**
 * Recorta un historial de conversación al presupuesto de la tarea, conservando
 * los mensajes más recientes. El historial es contexto de apoyo: dejar sin
 * servicio a quien acumula conversación sería peor que responder con menos
 * memoria. `reservedChars` cubre el mensaje actual y el resto de la entrada.
 */
export function trimConversationHistory(
  taskId: AITaskId,
  history: ConversationMessage[],
  reservedChars: number
): ConversationMessage[] {
  const spec = getTaskSpec(taskId);
  // Margen para las claves JSON del propio contenedor de la entrada.
  const budget = spec.maxInputChars - reservedChars - 256;
  if (budget <= 0) return [];

  const kept: ConversationMessage[] = [];
  let used = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const size = serializeForBudget(history[index]).length;
    if (used + size > budget) break;
    used += size;
    kept.unshift(history[index]);
  }
  return kept;
}

/**
 * El contexto de la app puede crecer sin control (historial de posts, captions
 * importados). Se recorta al presupuesto de la tarea en vez de fallar: es
 * información de apoyo, no la petición del usuario.
 */
function truncateContext(context: unknown, budget: number): unknown {
  if (context === undefined || context === null || budget <= 0) return undefined;
  const serialized = serializeForBudget(context);
  if (serialized.length <= budget) return context;
  return `${serialized.slice(0, budget)}\n...[contexto truncado por límite de tamaño]`;
}

export async function runLegacyTask(options: LegacyTaskOptions): Promise<{ json: unknown; text: string }> {
  const spec = getTaskSpec(options.taskId);
  const gateway = options.gateway ?? getModelGateway();
  const lang = options.locale === "en" ? "English" : "Spanish";
  const mode = options.mode ?? "json";

  const inputSerialized = serializeForBudget(options.input);
  // Segunda comprobación: las rutas ya validan el tamaño antes de consumir
  // cuota con `assertInputWithinTaskLimit`, pero el límite se aplica aquí
  // también para que ninguna llamada pueda saltárselo.
  assertInputWithinTaskLimit(options.taskId, options.input);

  const contextBudget = spec.maxInputChars - inputSerialized.length;
  const context = truncateContext(options.context, contextBudget);

  const jsonRule = mode === "json" ? " Return ONLY valid JSON, no markdown." : "";
  const system = `${options.system}\n\n${UNTRUSTED_DATA_POLICY}\n\nRespond in ${lang}.${jsonRule}`;

  const userMessage = buildUserMessage(options.instruction, [
    { label: "user_input", value: options.input },
    { label: "app_context", value: context },
  ]);

  const result = await gateway.generate({
    taskId: spec.id,
    modelAlias: spec.modelAlias,
    system,
    messages: [{ role: "user", content: userMessage }],
    temperature: spec.temperature,
    maxOutputTokens: spec.maxOutputTokens,
    timeoutMs: spec.timeoutMs,
    maxAttempts: spec.maxAttempts,
    responseFormat: mode === "json" ? { type: "json_object" } : { type: "text" },
    modelOverride: options.modelOverride,
  });

  return { json: result.json, text: result.text };
}

export async function runLegacyJsonTask(options: Omit<LegacyTaskOptions, "mode">): Promise<unknown> {
  const { json } = await runLegacyTask({ ...options, mode: "json" });
  return json;
}

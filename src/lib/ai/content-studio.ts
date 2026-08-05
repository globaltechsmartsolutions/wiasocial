import "server-only";

import type { UserAIContext } from "@/lib/ai-context";
import { buildTemplateCatalogText, routeContentTemplate } from "@/lib/content-template-router";
import { AIGatewayError, type ModelGateway } from "@/lib/ai/gateway";
import { assembleTaskContext } from "@/lib/ai/context-assembler";
import { getTaskSpec } from "@/lib/ai/task-registry";
import { buildUserMessage, UNTRUSTED_DATA_POLICY } from "@/lib/ai/untrusted";
import {
  CONTENT_STUDIO_PROVIDER_SCHEMA,
  contentStudioInputSchema,
  contentStudioOutputSchema,
  type ContentStudioInput,
  type ContentStudioOutput,
} from "@/lib/ai/schemas/content-studio";
import type { QuotaManager } from "@/lib/ai/quota";
import type { RunPersistence } from "@/lib/ai/persistence";

/**
 * Ejecutor de Content Studio v2: primera tarea migrada al núcleo de IA.
 *
 * Orden del flujo (§6.1):
 *   validar entrada -> reservar cuota -> crear generation_run -> llamar al
 *   proveedor -> validar salida con esquema -> persistir resultado en servidor
 *   -> confirmar cuota. Si el proveedor o la validación fallan, la reserva se
 *   libera y el run queda registrado como fallido.
 *
 * El resultado se guarda en servidor ANTES de responder: cerrar el navegador
 * no pierde una generación pagada.
 */

export class ContentStudioValidationError extends Error {
  constructor(detail: string) {
    super(`Brief no válido: ${detail}`);
    this.name = "ContentStudioValidationError";
  }
}

export interface ContentStudioDeps {
  gateway: ModelGateway;
  persistence: RunPersistence;
  quota: QuotaManager;
}

export interface ContentStudioRunResult {
  output: ContentStudioOutput;
  runId: string | null;
}

const CONTENT_STUDIO_SYSTEM = `Act like a senior digital marketing professional. Prioritize positioning, ICP clarity, funnel stage, offer relevance, conversion intent, measurable KPIs and legal organic growth. Avoid generic advice, bots, spam, fake engagement or unverifiable claims.

You are a premium Instagram creative director, conversion copywriter and carousel planner for a serious Growth OS. Your job is to create content that is specific, publishable, commercial and visually ready. If the brand_context data includes brandMemory, treat it as the source of truth for positioning, proof, objections, voice, visual style and forbidden claims. Avoid generic motivational phrases, vague claims, fake scarcity, engagement bait, spam and unverifiable guarantees.`;

function buildInstruction(): string {
  return `Create a premium Instagram content pack.

The brief is in the user_brief data block. The brand information is in the brand_context data block. A deterministic template router already analyzed the brief; its recommendation is in the router_recommendation data block.

Hard rules:
- Respect the desiredAction from user_brief. If the brief asks for DM, do not change it to a public comment.
- Make the piece sound native to Instagram, not like a blog post.
- Choose contentRoute.templateId from the available template ids below. Use the router recommendation unless there is a stronger creative reason, and explain that reason in contentRoute.reasoning.
- If user_brief.preferredTemplateId is a valid template id, keep contentRoute.templateId exactly equal to it.
- Follow the chosen slidePattern closely. Each carousel slide has a clear job in the sequence.
- Do not paste the full topic into the cover. Extract a short, sharp cover concept.
- Carousel headlines must fit visually: ideally 4-9 words, never a long sentence on the cover.
- Give concrete visual direction, but do not rely on image generation for important text.
- qualityReview.score must be between 0 and 100.
- The top-level fields hook, reelScript, caption, cta, hashtags, storySequence and dmReplyTemplate mirror the primary piece for backwards compatibility.

Available carousel templates:
${buildTemplateCatalogText()}`;
}

function coerceRawInput(raw: Record<string, unknown>): Record<string, unknown> {
  const coerced: Record<string, unknown> = {};
  for (const key of Object.keys(contentStudioInputSchema.shape)) {
    const value = raw[key];
    if (value === undefined || value === null) continue;
    coerced[key] = typeof value === "string" ? value : String(value);
  }
  return coerced;
}

function parseContentStudioInput(raw: Record<string, unknown>): ContentStudioInput {
  const parsed = contentStudioInputSchema.safeParse(coerceRawInput(raw));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ContentStudioValidationError(
      issue ? `${issue.path.join(".")}: ${issue.message}` : "entrada no válida"
    );
  }
  return parsed.data;
}

export async function runContentStudio(
  userId: string,
  rawInput: Record<string, unknown>,
  context: UserAIContext,
  deps: ContentStudioDeps
): Promise<ContentStudioRunResult> {
  const spec = getTaskSpec("content");
  const input = parseContentStudioInput(rawInput);

  // 1. Reservar cuota antes de gastar dinero en el proveedor.
  const reservation = await deps.quota.reserve();

  // 2. Registrar la ejecución en servidor antes de llamar al proveedor.
  const runId = await deps.persistence.createRun({
    userId,
    taskId: spec.id,
    promptVersion: spec.promptVersion,
    modelAlias: spec.modelAlias,
    input,
  });
  await deps.persistence.recordUsageEvent({
    runId,
    userId,
    taskId: spec.id,
    eventType: "reserve",
    units: spec.quotaUnits,
  });
  const stepRowId = await deps.persistence.createStep(runId, userId, "generate");

  const route = routeContentTemplate({
    topic: input.keyMessage,
    niche: input.niche,
    audience: input.audience,
    offer: input.offer,
    goal: input.goal,
    funnelStage: input.funnelStage,
    commercialIntensity: input.commercialIntensity,
    preferredTemplateId: input.preferredTemplateId,
    objection: input.objection,
    proof: input.proof,
    desiredAction: input.desiredAction,
  });

  const snapshot = assembleTaskContext("content", context);
  const lang = input.locale === "en" ? "English" : "Spanish";
  const system = `${CONTENT_STUDIO_SYSTEM}\n\n${UNTRUSTED_DATA_POLICY}\n\nRespond in ${lang}.`;
  const userMessage = buildUserMessage(buildInstruction(), [
    { label: "user_brief", value: input },
    { label: "brand_context", value: { ...snapshot.internal, ...snapshot.untrusted } },
    { label: "router_recommendation", value: route },
  ]);

  try {
    // 3. Llamada al proveedor con salida estructurada estricta.
    const result = await deps.gateway.generate({
      taskId: spec.id,
      modelAlias: spec.modelAlias,
      system,
      messages: [{ role: "user", content: userMessage }],
      temperature: spec.temperature,
      maxOutputTokens: spec.maxOutputTokens,
      timeoutMs: spec.timeoutMs,
      maxAttempts: spec.maxAttempts,
      responseFormat: {
        type: "json_schema",
        name: "content_studio_result",
        schema: CONTENT_STUDIO_PROVIDER_SCHEMA,
      },
    });

    // 4. Validación de servidor: el esquema del proveedor garantiza la forma,
    //    Zod garantiza rangos y reglas de negocio. Las dos son obligatorias.
    const validated = contentStudioOutputSchema.safeParse(result.json);
    if (!validated.success) {
      const issue = validated.error.issues[0];
      throw new AIGatewayError(
        "invalid_output",
        `La salida del proveedor incumple el contrato (${issue?.path.join(".")}: ${issue?.message})`,
        { retryable: false }
      );
    }

    const metrics = {
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
      estimatedCostUsd: result.estimatedCostUsd,
      attempts: result.attempts,
    };

    // 5. Persistir el resultado en servidor antes de responder al navegador.
    await deps.persistence.finishStep(stepRowId, { status: "succeeded", ...metrics });
    if (runId) await deps.persistence.completeRun(runId, { result: validated.data, ...metrics });
    await deps.persistence.recordUsageEvent({
      runId,
      userId,
      taskId: spec.id,
      eventType: "settle",
      units: spec.quotaUnits,
      ...metrics,
    });

    return { output: validated.data, runId };
  } catch (err) {
    const normalized =
      err instanceof AIGatewayError
        ? err
        : new AIGatewayError("provider_error", err instanceof Error ? err.message : String(err));

    // Un fallo del proveedor no debe consumir la cuota del usuario.
    const released = await deps.quota.release(reservation);

    await deps.persistence.finishStep(stepRowId, {
      status: "failed",
      errorCode: normalized.code,
      errorMessage: normalized.message,
    });
    if (runId) {
      await deps.persistence.failRun(runId, {
        errorCode: normalized.code,
        errorMessage: normalized.message,
        quotaReleased: released,
      });
    }
    await deps.persistence.recordUsageEvent({
      runId,
      userId,
      taskId: spec.id,
      eventType: released ? "release" : "failure",
      units: spec.quotaUnits,
    });

    throw normalized;
  }
}

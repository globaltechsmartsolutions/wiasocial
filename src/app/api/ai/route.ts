import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { enforceAIUsage } from "@/lib/ai-usage-guard";
import { UsageBackendError, UsageLimitError } from "@/lib/ai-usage";
import { buildUserAIContext, type UserAIContext } from "@/lib/ai-context";
import { buildTemplateCatalogText, buildTemplateRouterPromptContext, routeContentTemplate } from "@/lib/content-template-router";
import { isConfiguredEnvValue } from "@/lib/env";
import { isOpenAIConfigured } from "@/lib/openai";
import { readJsonObject } from "@/lib/request-validation";
import { AIGatewayError, getModelGateway } from "@/lib/ai/gateway";
import { AIInputTooLargeError, assertInputWithinTaskLimit, runLegacyJsonTask } from "@/lib/ai/legacy-call";
import { isContentStudioV2Enabled } from "@/lib/ai/flags";
import { getTaskSpec, type AITaskId } from "@/lib/ai/task-registry";
import { buildUserMessage, UNTRUSTED_DATA_POLICY } from "@/lib/ai/untrusted";
import { ContentStudioValidationError, runContentStudio } from "@/lib/ai/content-studio";
import { createQuotaManager } from "@/lib/ai/quota";
import { AIPersistenceError, createRunPersistence } from "@/lib/ai/persistence";

type AIAction =
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
  | "competitor-analyze";

const AI_ACTIONS = new Set<AIAction>([
  "content",
  "reel-script",
  "stories",
  "hook-analyze",
  "hashtags",
  "profile-audit",
  "calendar",
  "content-series",
  "format-adapt",
  "engagement-plan",
  "engagement-targets",
  "best-times",
  "competitor-analyze",
]);

function isAIAction(value: unknown): value is AIAction {
  return typeof value === "string" && AI_ACTIONS.has(value as AIAction);
}

const MARKETING_CONTEXT =
  "Act like a senior digital marketing professional. Prioritize positioning, ICP clarity, funnel stage, offer relevance, conversion intent, measurable KPIs and legal organic growth. Avoid generic advice, bots, spam, fake engagement or unverifiable claims.";

const CONTENT_STUDIO_SYSTEM =
  "You are a premium Instagram creative director, conversion copywriter and carousel planner for a serious Growth OS. Your job is to create content that is specific, publishable, commercial and visually ready. If the app_context data includes settings.brandMemory, treat it as the source of truth for positioning, proof, objections, voice, visual style and forbidden claims. Avoid generic motivational phrases, vague claims, fake scarcity, engagement bait, spam and unverifiable guarantees.";

/**
 * Cada acción define instrucciones FIJAS (texto de confianza del repositorio)
 * y pasa los campos del usuario como datos delimitados no confiables. Nunca se
 * interpola texto del usuario dentro de la instrucción.
 */
interface LegacyActionSpec {
  taskId: AITaskId;
  system: string;
  instruction: string;
  /** Claves de la petición que forman la entrada no confiable de la tarea. */
  inputKeys: string[];
}

const LEGACY_ACTIONS: Record<Exclude<AIAction, "content">, LegacyActionSpec> = {
  "reel-script": {
    taskId: "reel-script",
    system: "You are an expert Instagram Reel scriptwriter who writes for retention, authority and conversion.",
    instruction: `Write a Reel script for the request described in user_input (fields: topic, niche, duration in seconds, style, keyPoints).
Return JSON: { "hook": string, "script": string (multiline with [0-5s] style timestamps), "title": string }`,
    inputKeys: ["topic", "niche", "duration", "style", "keyPoints"],
  },
  stories: {
    taskId: "stories",
    system: "You are an Instagram Stories strategist focused on nurture, trust and DM conversion.",
    instruction: `Create 5 Instagram story slides for the idea described in user_input (fields: idea, storyType, cta).
Return JSON: { "stories": [{ "slide": number (1-5), "content": string, "type": "Hook"|"Problem"|"Solution"|"Engagement"|"CTA" }] }`,
    inputKeys: ["idea", "storyType", "cta"],
  },
  "hook-analyze": {
    taskId: "hook-analyze",
    system: "You are a viral hook analyst for Instagram Reels with performance marketing judgment.",
    instruction: `Analyze the hook provided in user_input.hook.
Return JSON: { "score": number (1-10), "strengths": string[], "weaknesses": string[], "variants": string[] (5 improved hooks) }`,
    inputKeys: ["hook"],
  },
  hashtags: {
    taskId: "hashtags",
    system:
      "You are an Instagram hashtag researcher who balances reach, buyer intent and niche relevance. You do NOT have access to live hashtag data: any volume figure is a rough estimate based on historical patterns and MUST be labeled as an estimate. Never present volumes as current measured data.",
    instruction: `Research hashtag clusters for the niche in user_input.niche.
Return JSON: { "clusters": [{ "tier": "large"|"medium"|"small", "hashtags": [{ "tag": string, "posts": string (approximate estimate labeled as such, e.g. "~120K (est.)"), "competition": string }] }], "disclaimer": string (one sentence, in the response language, clarifying that volumes are estimates without live data) }`,
    inputKeys: ["niche"],
  },
  "profile-audit": {
    taskId: "profile-audit",
    system: "You are an Instagram profile optimization expert focused on positioning and conversion.",
    instruction: `Audit the Instagram profile described in user_input (fields: bio, handle, niche). The goal is to grow followers legally.
Return JSON: { "overallScore": number (1-10), "items": [{ "category": string, "score": number (1-10), "status": "good"|"warning"|"bad", "tip": string }], "bioSuggestion": string }`,
    inputKeys: ["bio", "handle", "niche"],
  },
  calendar: {
    taskId: "calendar",
    system: "You are a content calendar strategist for Instagram growth and lead generation.",
    instruction: `Create a 7-day content calendar for the request in user_input (fields: niche, goal, startDate as YYYY-MM-DD; if startDate is missing, start from today).
Return JSON: { "items": [{ "day": "YYYY-MM-DD", "dayLabel": string (Mon-Sun in the response language), "type": "reel"|"carousel"|"story"|"post", "title": string, "hook": string, "time": "HH:MM" }] }`,
    inputKeys: ["niche", "goal", "startDate"],
  },
  "content-series": {
    taskId: "content-series",
    system: "You are a content series strategist who builds authority, demand and conversion momentum.",
    instruction: `Create a 7-day content series for the topic in user_input.idea and the niche in user_input.niche.
Return JSON: { "pieces": [{ "day": number (1-7), "type": "reel"|"carousel"|"story"|"post", "title": string, "hook": string, "description": string }] }`,
    inputKeys: ["idea", "niche"],
  },
  "format-adapt": {
    taskId: "format-adapt",
    system: "You are an Instagram content adapter who turns viral formats into brand-safe marketing assets.",
    instruction: `Adapt the viral format described in user_input (fields: formatName, structure, example) to the user's niche in user_input.niche.
Return JSON: { "adapted": string (full adapted content plan) }`,
    inputKeys: ["formatName", "structure", "example", "niche"],
  },
  "engagement-plan": {
    taskId: "engagement-plan",
    system:
      "You are an Instagram engagement coach focused on relationship-building and lead generation. Only suggest MANUAL authentic engagement, never bots. Do not invent real Instagram accounts; use generic @ placeholders unless the user provided observed accounts.",
    instruction: `Create a 15-minute daily engagement plan for the niche in user_input.niche.
Return JSON: { "tasks": [{ "username": string (generic @ placeholder or user-provided account only), "action": string, "commentTemplate": string }] } — exactly 5 tasks`,
    inputKeys: ["niche"],
  },
  "engagement-targets": {
    taskId: "engagement-targets",
    system:
      "You are an Instagram networking strategist. Suggest manual engagement targets by archetype or user-provided accounts only. Do not invent real public accounts.",
    instruction: `Suggest 5 Instagram account archetypes to engage with manually in the niche from user_input.niche.
Return JSON: { "targets": [{ "username": string (generic @ placeholder or user-provided account only), "niche": string, "followers": string (estimate or "unknown"), "engagementRate": string (estimate or "unknown"), "reason": string }] }`,
    inputKeys: ["niche"],
  },
  "best-times": {
    taskId: "best-times",
    system:
      "You are an Instagram analytics expert and performance marketer. When no real posting history is provided, base suggestions on industry benchmarks and clearly heuristic scores; never claim measured data you do not have.",
    instruction: `Suggest best posting times for the niche in user_input.niche. If user_input.postData contains the user's posting history, prioritize it; otherwise use industry benchmarks.
Return JSON: { "slots": [{ "day": string, "time": string, "score": number (1-100, heuristic), "reason": string }], "tip": string }`,
    inputKeys: ["niche", "postData"],
  },
  "competitor-analyze": {
    taskId: "competitor-analyze",
    system:
      "You are an Instagram competitor analyst with digital marketing and positioning expertise. You have no live Instagram data access: use only user-provided information and strategic pattern estimates, clearly labeled as estimates. Do not claim to know real current metrics.",
    instruction: `Analyze the competitor account named in user_input.username within the niche in user_input.niche. Use only user-provided information and strategic pattern estimates; do not claim live data access.
Return JSON: { "username": string, "followers": string (estimate), "niche": string, "topPosts": [{ "title": string, "views": string (estimate), "format": string, "hook": string }], "patterns": string[] }`,
    inputKeys: ["username", "niche"],
  },
};

// ── Content Studio legacy (fallback tras el feature flag) ────────────────────

const LEGACY_CONTENT_INSTRUCTION = `Create a premium Instagram content pack.

The brief is in the user_input data block (fields: niche, audience, offer, goal, tone, format, funnelStage, commercialIntensity, preferredTemplateId, keyMessage, objection, proof, desiredAction). The brand and account data is in app_context. A deterministic template router already analyzed the brief; its recommendation is in the router_recommendation data block.

Hard rules:
- Respect the desiredAction. If the brief asks for DM, do not change it to a public comment.
- Make the piece sound native to Instagram, not like a blog post.
- Choose a contentRoute.templateId from the available template ids. Use the router recommendation unless there is a stronger creative reason, and explain that reason.
- If user_input.preferredTemplateId is a valid template id, keep contentRoute.templateId exactly equal to it.
- Follow the chosen slidePattern closely. Each carousel slide should have a clear job in the sequence.
- Do not paste the full topic into the cover. Extract a short, sharp cover concept.
- For carousel slides, keep each headline short enough to fit visually: ideally 4-9 words, never a long sentence on the cover.
- Give concrete visual direction, but do not rely on image generation for important text.
- qualityReview.score must be from 0 to 100.
- Include legacy fields hook, reelScript, caption, cta, hashtags, storySequence and dmReplyTemplate for backwards compatibility.

Available carousel templates:
${buildTemplateCatalogText()}

Return JSON exactly with:
{
  "contentRoute": {
    "templateId": "myth_busting|mistake_fix|checklist|objection_handler|case_study|direct_offer|educational|comparison|before_after",
    "templateName": "string",
    "topicSummary": "short concept, not the full raw topic",
    "intent": "string",
    "reasoning": "string",
    "slidePattern": ["string"],
    "visualStyle": "string"
  },
  "strategy": {
    "angle": "string",
    "promise": "string",
    "audiencePain": "string",
    "conversionIntent": "string",
    "recommendedFormat": "reel|carousel|stories|post",
    "whyThisWillWork": "string"
  },
  "primaryPiece": {
    "title": "string",
    "hook": "string",
    "caption": "string",
    "cta": "string",
    "reelScript": "string with timestamps if useful",
    "publishingNotes": "string"
  },
  "variants": [
    { "label": "Directa", "angle": "string", "hook": "string", "caption": "string", "cta": "string" },
    { "label": "Educativa", "angle": "string", "hook": "string", "caption": "string", "cta": "string" },
    { "label": "Emocional", "angle": "string", "hook": "string", "caption": "string", "cta": "string" }
  ],
  "carousel": [
    { "slide": 1, "type": "string matching the chosen contentRoute.slidePattern job", "headline": "string", "support": "string", "visualCue": "string" }
  ],
  "stories": [
    { "slide": 1, "type": "hook|context|proof|engagement|cta", "text": "string", "sticker": "string", "cta": "string" }
  ],
  "dmFollowUp": "string",
  "visualDirection": {
    "template": "string",
    "mood": "string",
    "palette": ["string"],
    "coverIdea": "string",
    "assetPrompts": ["string"]
  },
  "qualityReview": {
    "score": 0,
    "strengths": ["string"],
    "risks": ["string"],
    "improvements": ["string"]
  },
  "hook": "string",
  "reelScript": "string",
  "caption": "string",
  "cta": "string",
  "hashtags": ["string"],
  "storySequence": ["string"],
  "dmReplyTemplate": "string"
}`;

function getGeminiKey() {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
}

function isGeminiConfigured(): boolean {
  return isConfiguredEnvValue(getGeminiKey());
}

function parseJsonObject(text: string) {
  const clean = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  const candidate = firstBrace >= 0 && lastBrace > firstBrace ? clean.slice(firstBrace, lastBrace + 1) : clean;

  try {
    return JSON.parse(candidate);
  } catch {
    throw new Error("La IA devolvió JSON incompleto. Vuelve a generar o concreta más el brief.");
  }
}

function getGeminiModelCandidates() {
  return [
    process.env.CONTENT_STUDIO_GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
  ].filter((model, index, models): model is string => Boolean(model) && models.indexOf(model) === index);
}

async function geminiContentJson(userMessage: string, locale: string) {
  const spec = getTaskSpec("content");
  const lang = locale === "es" ? "Spanish" : "English";
  const apiKey = getGeminiKey();
  let data: Record<string, unknown> | null = null;
  let lastError = "Gemini request failed";

  for (const model of getGeminiModelCandidates()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(spec.timeoutMs),
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `${MARKETING_CONTEXT}\n\n${CONTENT_STUDIO_SYSTEM}\n\n${UNTRUSTED_DATA_POLICY}\n\nRespond in ${lang}. Return ONLY valid JSON, no markdown.`,
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: spec.temperature,
          maxOutputTokens: spec.maxOutputTokens,
        },
      }),
    });

    const candidateData = await res.json();
    if (res.ok) {
      data = candidateData;
      break;
    }

    const message = candidateData.error?.message || candidateData.error || "Gemini request failed";
    lastError = typeof message === "string" ? message : JSON.stringify(message);
  }

  if (!data) throw new Error(lastError);

  const content = (data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined)
    ?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
  if (!content) throw new Error("No Gemini response");
  return parseJsonObject(content);
}

async function runLegacyContent(
  params: Record<string, unknown>,
  locale: string,
  context: UserAIContext
): Promise<unknown> {
  const route = routeContentTemplate({
    topic: String(params.keyMessage ?? ""),
    niche: String(params.niche ?? ""),
    audience: String(params.audience ?? ""),
    offer: String(params.offer ?? ""),
    goal: String(params.goal ?? ""),
    funnelStage: String(params.funnelStage ?? ""),
    commercialIntensity: String(params.commercialIntensity ?? ""),
    preferredTemplateId: String(params.preferredTemplateId ?? ""),
    objection: String(params.objection ?? ""),
    proof: String(params.proof ?? ""),
    desiredAction: String(params.desiredAction ?? ""),
  });

  if (isOpenAIConfigured()) {
    return runLegacyJsonTask({
      taskId: "content",
      system: `${MARKETING_CONTEXT}\n\n${CONTENT_STUDIO_SYSTEM}`,
      instruction: `${LEGACY_CONTENT_INSTRUCTION}\n\n${buildTemplateRouterPromptContext(route)}`,
      input: params,
      context,
      locale,
      modelOverride: process.env.CONTENT_STUDIO_OPENAI_MODEL || process.env.CONTENT_STUDIO_PREMIUM_MODEL,
    });
  }

  const userMessage = buildUserMessage(
    `${LEGACY_CONTENT_INSTRUCTION}\n\n${buildTemplateRouterPromptContext(route)}`,
    [
      { label: "user_input", value: params },
      { label: "app_context", value: context },
    ]
  );
  return geminiContentJson(userMessage, locale);
}

function errorResponse(err: unknown): NextResponse {
  if (err instanceof ContentStudioValidationError || err instanceof AIInputTooLargeError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof UsageLimitError) {
    return NextResponse.json(
      { error: "USAGE_LIMIT_EXCEEDED", used: err.used, limit: err.limit },
      { status: 429 }
    );
  }
  if (err instanceof UsageBackendError) {
    console.error("[ai-usage] contador no disponible:", err.message);
    return NextResponse.json({ error: "AI_USAGE_UNAVAILABLE" }, { status: 503 });
  }
  if (err instanceof AIPersistenceError) {
    console.error("[ai-runs]", err.message);
    return NextResponse.json({ error: "AI_PERSISTENCE_UNAVAILABLE" }, { status: 503 });
  }
  if (err instanceof AIGatewayError) {
    if (err.code === "not_configured") {
      return NextResponse.json(
        { error: "Configura OPENAI_API_KEY o GOOGLE_GENERATIVE_AI_API_KEY en .env.local" },
        { status: 503 }
      );
    }
    const status = err.code === "timeout" ? 504 : err.code === "rate_limit" ? 503 : 502;
    return NextResponse.json({ error: err.message }, { status });
  }
  const message = err instanceof Error ? err.message : "AI error";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const token = getAccessTokenFromRequest(request);
    const user = await getUserFromAccessToken(token);
    if (!user || !token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = await enforceUserRateLimit(request, user.id, "api-ai", 30, 60 * 60 * 1000);
    if (limited) return limited;

    const parsed = await readJsonObject<{ action?: unknown; locale?: string; [key: string]: unknown }>(request);
    if (!parsed.ok) return parsed.response;
    const { action: rawAction, locale = "es", ...params } = parsed.data;
    if (!isAIAction(rawAction)) {
      return NextResponse.json({ error: "Acción de IA no válida" }, { status: 400 });
    }
    const action = rawAction;
    const canUseGeminiForContent = action === "content" && isGeminiConfigured();

    if (!isOpenAIConfigured() && !canUseGeminiForContent) {
      return NextResponse.json(
        { error: "Configura OPENAI_API_KEY o GOOGLE_GENERATIVE_AI_API_KEY en .env.local" },
        { status: 503 }
      );
    }

    // ── Content Studio v2: flujo migrado con trazabilidad y cuota reservable ──
    if (action === "content" && isContentStudioV2Enabled() && isOpenAIConfigured()) {
      const context = await buildUserAIContext(user.id, token);
      const { output, runId } = await runContentStudio(user.id, { ...params, locale }, context, {
        gateway: getModelGateway(),
        persistence: createRunPersistence(),
        quota: createQuotaManager(user.id, token),
      });
      return NextResponse.json({ ...output, runId });
    }

    // ── Ruta antigua ──────────────────────────────────────────────────────────
    // El tamaño de la entrada se valida ANTES de tocar el contador: una entrada
    // fuera de límite no debe gastar una generación del plan.
    const actionSpec = action === "content" ? null : LEGACY_ACTIONS[action];
    const input: Record<string, unknown> = {};
    if (actionSpec) {
      for (const key of actionSpec.inputKeys) {
        if (params[key] !== undefined) input[key] = params[key];
      }
    }
    assertInputWithinTaskLimit(action, actionSpec ? input : params);

    const usageBlocked = await enforceAIUsage(user.id, token);
    if (usageBlocked) return usageBlocked;

    const context = await buildUserAIContext(user.id, token);

    if (!actionSpec) {
      const result = await runLegacyContent(params, locale, context);
      return NextResponse.json(result);
    }

    const result = await runLegacyJsonTask({
      taskId: actionSpec.taskId,
      system: `${MARKETING_CONTEXT}\n\n${actionSpec.system}`,
      instruction: actionSpec.instruction,
      input,
      context,
      locale,
    });

    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

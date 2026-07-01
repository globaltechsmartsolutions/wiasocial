import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { buildUserAIContext, type UserAIContext } from "@/lib/ai-context";
import { buildTemplateRouterPromptContext, routeContentTemplate } from "@/lib/content-template-router";
import { openai, isOpenAIConfigured } from "@/lib/openai";

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

const MARKETING_CONTEXT =
  "Act like a senior digital marketing professional. Prioritize positioning, ICP clarity, funnel stage, offer relevance, conversion intent, measurable KPIs and legal organic growth. Avoid generic advice, bots, spam, fake engagement or unverifiable claims.";

const CONTENT_STUDIO_SYSTEM =
  "You are a premium Instagram creative director, conversion copywriter and carousel planner for a serious Growth OS. Your job is to create content that is specific, publishable, commercial and visually ready. Avoid generic motivational phrases, vague claims, fake scarcity, engagement bait, spam and unverifiable guarantees.";

async function chat(system: string, user: string, locale = "es", context?: UserAIContext, model?: string) {
  const lang = locale === "es" ? "Spanish" : "English";
  const completion = await openai.chat.completions.create({
    model: model ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: `${MARKETING_CONTEXT}\n\n${system}\n\nRespond in ${lang}. Return ONLY valid JSON, no markdown.` },
      {
        role: "user",
        content: `${context ? `Trusted app context:\n${JSON.stringify(context)}\n\n` : ""}User request:\n${user}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No AI response");
  return JSON.parse(content);
}

function getGeminiKey() {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
}

function isGeminiConfigured(): boolean {
  const key = getGeminiKey();
  return key !== "" && key !== "your_google_generative_ai_api_key" && key !== "your_gemini_api_key";
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

async function geminiJson(system: string, user: string, locale = "es", context?: UserAIContext) {
  const lang = locale === "es" ? "Spanish" : "English";
  const apiKey = getGeminiKey();
  let data: Record<string, unknown> | null = null;
  let lastError = "Gemini request failed";

  for (const model of getGeminiModelCandidates()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `${MARKETING_CONTEXT}\n\n${system}\n\nRespond in ${lang}. Return ONLY valid JSON, no markdown.`,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${context ? `Trusted app context:\n${JSON.stringify(context)}\n\n` : ""}User request:\n${user}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.8,
          maxOutputTokens: 8192,
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

function buildPremiumContentPrompt(params: Record<string, unknown>) {
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
  const routerContext = buildTemplateRouterPromptContext(route);

  return `Create a premium Instagram content pack for:
Niche: ${params.niche as string}
Audience: ${params.audience as string}
Offer: ${params.offer as string}
Goal: ${params.goal as string}
Tone: ${params.tone as string}
Preferred format: ${String(params.format ?? "carousel")}
Funnel stage: ${String(params.funnelStage ?? "conversion")}
Commercial intensity: ${String(params.commercialIntensity ?? "balanced")}
Preferred carousel template: ${String(params.preferredTemplateId ?? "auto")}
Main message or topic: ${String(params.keyMessage ?? "not specified")}
Main objection to address: ${String(params.objection ?? "not specified")}
Proof, case or credibility asset: ${String(params.proof ?? "not specified")}
Desired user action: ${String(params.desiredAction ?? "DM or lead action")}

${routerContext}

Hard rules:
- Respect the desired action. If the brief asks for DM, do not change it to a public comment.
- Make the piece sound native to Instagram, not like a blog post.
- Choose a contentRoute.templateId from the available template ids. Use the router recommendation unless there is a stronger creative reason, and explain that reason.
- If Preferred carousel template is not "auto" or empty, keep contentRoute.templateId exactly equal to that preferred template.
- Follow the chosen slidePattern closely. Each carousel slide should have a clear job in the sequence.
- Do not paste the full topic into the cover. Extract a short, sharp cover concept.
- For carousel slides, keep each headline short enough to fit visually: ideally 4-9 words, never a long sentence on the cover.
- Give concrete visual direction, but do not rely on image generation for important text.
- qualityReview.score must be from 0 to 100.
- Include legacy fields hook, reelScript, caption, cta, hashtags, storySequence and dmReplyTemplate for backwards compatibility.

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

    const body = await request.json();
    const { action, locale = "es", ...params } = body as { action: AIAction; locale?: string; [key: string]: unknown };
    const canUseGeminiForContent = action === "content" && isGeminiConfigured();

    if (!isOpenAIConfigured() && !canUseGeminiForContent) {
      return NextResponse.json(
        { error: "Configura OPENAI_API_KEY o GOOGLE_GENERATIVE_AI_API_KEY en .env.local" },
        { status: 503 }
      );
    }

    const context = await buildUserAIContext(user.id, token);

    let result: unknown;

    switch (action) {
      case "content": {
        const contentModel = process.env.CONTENT_STUDIO_OPENAI_MODEL || process.env.CONTENT_STUDIO_PREMIUM_MODEL;
        const prompt = buildPremiumContentPrompt(params);
        result = isOpenAIConfigured()
          ? await chat(CONTENT_STUDIO_SYSTEM, prompt, locale, context, contentModel)
          : await geminiJson(CONTENT_STUDIO_SYSTEM, prompt, locale, context);
        break;
      }

      case "reel-script":
        result = await chat(
          "You are an expert Instagram Reel scriptwriter who writes for retention, authority and conversion.",
          `Write a Reel script for:
Topic: ${params.topic}
Niche: ${params.niche}
Duration: ${params.duration}s
Style: ${params.style}
Key points: ${params.keyPoints || "none"}

Return JSON: { hook: string, script: string (multiline with [0-5s] style timestamps), title: string }`
, locale, context
        );
        break;

      case "stories":
        result = await chat(
          "You are an Instagram Stories strategist focused on nurture, trust and DM conversion.",
          `Create 5 Instagram story slides for:
Idea: ${params.idea}
Type: ${params.storyType}
CTA: ${params.cta}

Return JSON: { stories: [{ slide (1-5), content, type (Hook|Problem|Solution|Engagement|CTA) }] }`
, locale, context
        );
        break;

      case "hook-analyze":
        result = await chat(
          "You are a viral hook analyst for Instagram Reels with performance marketing judgment.",
          `Analyze this hook: "${params.hook}"
Return JSON: { score (1-10), strengths (array), weaknesses (array), variants (array of 5 improved hooks) }`
, locale, context
        );
        break;

      case "hashtags":
        result = await chat(
          "You are an Instagram hashtag researcher who balances reach, buyer intent and niche relevance.",
          `Research hashtags for niche: ${params.niche}
Return JSON: { clusters: [{ tier: "large"|"medium"|"small", hashtags: [{ tag, posts (e.g. "120K"), competition }] }] }`
, locale, context
        );
        break;

      case "profile-audit":
        result = await chat(
          "You are an Instagram profile optimization expert focused on positioning and conversion.",
          `Audit this profile:
Bio: ${params.bio || "empty"}
Handle: ${params.handle || "unknown"}
Niche: ${params.niche}
Goal: grow followers legally

Return JSON: { overallScore (1-10), items: [{ category, score (1-10), status ("good"|"warning"|"bad"), tip }], bioSuggestion }`
, locale, context
        );
        break;

      case "calendar":
        result = await chat(
          "You are a content calendar strategist for Instagram growth and lead generation.",
          `Create a 7-day content calendar for:
Niche: ${params.niche}
Goal: ${params.goal || "followers"}
Starting date: ${params.startDate || new Date().toISOString().split("T")[0]}

Return JSON: { items: [{ day (YYYY-MM-DD), dayLabel (Mon-Sun in locale), type (reel|carousel|story|post), title, hook, time (HH:MM) }] }`
, locale, context
        );
        break;

      case "content-series":
        result = await chat(
          "You are a content series strategist who builds authority, demand and conversion momentum.",
          `Create a 7-day content series for topic: ${params.idea}
Niche: ${params.niche || "general"}

Return JSON: { pieces: [{ day (1-7), type (reel|carousel|story|post), title, hook, description }] }`
, locale, context
        );
        break;

      case "format-adapt":
        result = await chat(
          "You are an Instagram content adapter who turns viral formats into brand-safe marketing assets.",
          `Adapt this viral format to the user's niche:
Format: ${params.formatName}
Structure: ${JSON.stringify(params.structure)}
Example: ${params.example}
Niche: ${params.niche}

Return JSON: { adapted: (full adapted content plan as string) }`
, locale, context
        );
        break;

      case "engagement-plan":
        result = await chat(
          "You are an Instagram engagement coach focused on relationship-building and lead generation. Only suggest MANUAL authentic engagement, never bots. Do not invent real Instagram accounts; use generic @ placeholders unless the user provided observed accounts.",
          `Create a 15-minute daily engagement plan for niche: ${params.niche}
Return JSON: { tasks: [{ username (generic @ placeholder or user-provided account only), action, commentTemplate }] } — exactly 5 tasks`
, locale, context
        );
        break;

      case "engagement-targets":
        result = await chat(
          "You are an Instagram networking strategist. Suggest manual engagement targets by archetype or user-provided accounts only. Do not invent real public accounts.",
          `Find 5 Instagram accounts to engage with manually in niche: ${params.niche}
Return JSON: { targets: [{ username (generic @ placeholder or user-provided account only), niche, followers (estimate or "unknown"), engagementRate (estimate or "unknown"), reason }] }`
, locale, context
        );
        break;

      case "best-times":
        result = await chat(
          "You are an Instagram analytics expert and performance marketer.",
          `Suggest best posting times for:
Niche: ${params.niche}
${params.postData ? `User's post history: ${JSON.stringify(params.postData)}` : "No history yet — use industry benchmarks"}

Return JSON: { slots: [{ day, time, score (1-100), reason }], tip }`
, locale, context
        );
        break;

      case "competitor-analyze":
        result = await chat(
          "You are an Instagram competitor analyst with digital marketing and positioning expertise. If live data is unavailable, clearly label outputs as strategic estimates based on user-provided context.",
          `Analyze competitor @${params.username} in niche ${params.niche}.
Use only user-provided information and strategic pattern estimates; do not claim live data access.
Return JSON: { username, followers (estimate), niche, topPosts: [{ title, views (estimate), format, hook }], patterns (array) }`
, locale, context
        );
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

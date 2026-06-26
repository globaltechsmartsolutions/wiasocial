import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { buildUserAIContext, type UserAIContext } from "@/lib/ai-context";
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

async function chat(system: string, user: string, locale = "es", context?: UserAIContext) {
  const lang = locale === "es" ? "Spanish" : "English";
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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

export async function POST(request: Request) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY no configurada en .env.local" },
      { status: 503 }
    );
  }

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
    const context = await buildUserAIContext(user.id, token);

    let result: unknown;

    switch (action) {
      case "content":
        result = await chat(
          "You are an expert Instagram content strategist and conversion-focused digital marketer.",
          `Generate viral Instagram content for:
Niche: ${params.niche as string}
Audience: ${params.audience as string}
Offer: ${params.offer as string}
Goal: ${params.goal as string}
Tone: ${params.tone as string}

Return JSON: { hook, reelScript, caption, cta, hashtags (array), storySequence (array of 5), dmReplyTemplate }`
, locale, context
        );
        break;

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

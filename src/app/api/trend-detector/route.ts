import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { enforceAIUsage } from "@/lib/ai-usage-guard";
import { buildUserAIContext } from "@/lib/ai-context";
import { isOpenAIConfigured } from "@/lib/openai";
import { runLegacyJsonTask } from "@/lib/ai/legacy-call";
import { getSupabaseForUser } from "@/lib/supabase-admin";
import { readJsonObject } from "@/lib/request-validation";

const TREND_SYSTEM_PROMPT = `You are a senior social media content strategist specialized in Instagram and short-form content. Analyze the user's niche and settings, and return the top 5 content opportunities they should act on this week.

IMPORTANT — you have NO access to live trend data, social listening or real-time sources:
- Never claim that a topic "is trending right now" or cite current metrics you cannot verify.
- Base every opportunity on durable niche patterns, seasonality and the user's own data in app_context, and present it as a strategic hypothesis, not as a measured trend.
- In "whyTrending", explain the strategic reasoning (audience pain, seasonality, recurring formats), clearly framed as an estimate.
- Never invent recent events, statistics or figures.

Rules:
- Prioritize opportunities that are specific to the niche, not generic.
- Each opportunity must have a specific content angle and hook suggestion.
- Never recommend bots, fake engagement, or unethical practices.
- Return JSON only with this exact shape:
{
  "trends": [
    {
      "topic": string,
      "whyTrending": string (strategic rationale labeled as an estimate, not a live-data claim),
      "urgency": "high" | "medium" | "low",
      "contentIdea": string,
      "hookSuggestion": string,
      "bestFormat": "reel" | "carousel" | "story" | "post",
      "viralAngle": string,
      "audienceInsight": string
    }
  ],
  "overallInsight": string (must mention that these are strategic opportunities based on niche patterns, not live trend measurements),
  "weeklyFocus": string
}`;

export async function GET(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseForUser(token);
  const { data } = await sb
    .from("trend_detector_cache")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ result: data?.result ?? null, createdAt: data?.created_at ?? null });
}

export async function POST(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceUserRateLimit(request, user.id, "trend-detector", 12, 60 * 60 * 1000);
  if (limited) return limited;
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI no configurada" }, { status: 503 });
  }

  const parsed = await readJsonObject<{ locale?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const locale = parsed.data.locale ?? "es";

  const ctx = await buildUserAIContext(user.id, token);

  const usageBlocked = await enforceAIUsage(user.id, token);
  if (usageBlocked) return usageBlocked;

  const result = await runLegacyJsonTask({
    taskId: "trend-detector",
    system: TREND_SYSTEM_PROMPT,
    instruction:
      "Identify this week's strategic content opportunities for the user's niche using only the data in app_context. Remember: no live trend data, label everything as strategic estimates.",
    context: ctx,
    locale,
  });

  const sb = getSupabaseForUser(token);
  await sb.from("trend_detector_cache").upsert(
    { user_id: user.id, result, created_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  return NextResponse.json({ result, createdAt: new Date().toISOString() });
}

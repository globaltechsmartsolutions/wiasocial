import { NextResponse } from "next/server";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { enforceAIUsage } from "@/lib/ai-usage-guard";
import { buildUserAIContext } from "@/lib/ai-context";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { getSupabaseForUser } from "@/lib/supabase-admin";

const TREND_SYSTEM_PROMPT = `You are a senior social media trend analyst specialized in Instagram and short-form content. Analyze the user's niche and settings, and return the top 5 trending topics or content opportunities they should act on THIS WEEK.

Rules:
- Base your analysis on current content marketing trends, the user's niche, and their audience profile
- Prioritize topics that are genuinely trending, not generic
- Each trend must have a specific content angle and hook suggestion
- Never recommend bots, fake engagement, or unethical practices
- Return JSON only with this exact shape:
{
  "trends": [
    {
      "topic": string,
      "whyTrending": string,
      "urgency": "high" | "medium" | "low",
      "contentIdea": string,
      "hookSuggestion": string,
      "bestFormat": "reel" | "carousel" | "story" | "post",
      "viralAngle": string,
      "audienceInsight": string
    }
  ],
  "overallInsight": string,
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
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI no configurada" }, { status: 503 });
  }

  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const locale = (body.locale as string) ?? "es";

  const ctx = await buildUserAIContext(user.id, token);
  const langInstruction = locale === "es" ? "Respond entirely in Spanish." : "Respond entirely in English.";

  const usageBlocked = await enforceAIUsage(user.id, token);
  if (usageBlocked) return usageBlocked;

  const completion = await openai!.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: `${TREND_SYSTEM_PROMPT}\n\n${langInstruction}` },
      {
        role: "user",
        content: `User context:\n${JSON.stringify(ctx, null, 2)}\n\nAnalyze trending content opportunities for this user's niche this week.`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const result = JSON.parse(raw);

  const sb = getSupabaseForUser(token);
  await sb.from("trend_detector_cache").upsert(
    { user_id: user.id, result, created_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  return NextResponse.json({ result, createdAt: new Date().toISOString() });
}

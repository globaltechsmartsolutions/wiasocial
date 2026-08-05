import { NextResponse } from "next/server";
import { respondToAIError } from "@/lib/ai/error-response";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { enforceAIUsage } from "@/lib/ai-usage-guard";
import { buildUserAIContext } from "@/lib/ai-context";
import { isOpenAIConfigured } from "@/lib/openai";
import { runLegacyJsonTask } from "@/lib/ai/legacy-call";
import { getSupabaseForUser } from "@/lib/supabase-admin";
import { readJsonObject } from "@/lib/request-validation";

export async function GET(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const { data } = await getSupabaseForUser(token)
    .from("daily_briefs")
    .select("brief")
    .eq("user_id", user.id)
    .eq("brief_date", today)
    .maybeSingle();

  return NextResponse.json({ brief: data?.brief ?? null, date: today });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (err) {
    return respondToAIError(err, "daily-brief");
  }
}

async function handlePost(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceUserRateLimit(request, user.id, "daily-brief", 12, 60 * 60 * 1000);
  if (limited) return limited;
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI no configurada" }, { status: 503 });
  }

  const parsed = await readJsonObject<{ locale?: string; force?: boolean }>(request);
  if (!parsed.ok) return parsed.response;
  const { locale = "es", force = false } = parsed.data;
  const today = new Date().toISOString().split("T")[0];
  const sb = getSupabaseForUser(token);

  const { data: existing } = await sb
    .from("daily_briefs")
    .select("brief")
    .eq("user_id", user.id)
    .eq("brief_date", today)
    .maybeSingle();

  if (existing?.brief && !force) {
    return NextResponse.json({ brief: existing.brief, date: today, cached: true });
  }

  const context = await buildUserAIContext(user.id, token);

  const usageBlocked = await enforceAIUsage(user.id, token);
  if (usageBlocked) return usageBlocked;

  const brief = await runLegacyJsonTask({
    taskId: "daily-brief",
    system: `You are a senior digital marketing director for Instagram-led businesses. Generate a personalized daily brief that connects content, audience, offer, funnel stage, lead generation and conversion. Use ONLY provided context data. Make every action measurable and commercially useful. Return JSON only:
{
  "headline": string,
  "focus": string,
  "priorityActions": string[],
  "contentIdea": { "format": string, "hook": string, "cta": string },
  "engagementTask": string,
  "leadAction": string,
  "growthTip": string,
  "motivation": string
}`,
    instruction: "Generate today's personalized daily brief using only the data in app_context.",
    context,
    locale,
  });
  await sb.from("daily_briefs").upsert({
    user_id: user.id,
    brief_date: today,
    brief,
  }, { onConflict: "user_id,brief_date" });

  return NextResponse.json({ brief, date: today, cached: false });
}

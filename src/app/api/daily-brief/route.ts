import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { buildUserAIContext } from "@/lib/ai-context";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { getSupabaseForUser } from "@/lib/supabase-admin";

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
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI no configurada" }, { status: 503 });
  }

  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceUserRateLimit(request, user.id, "daily-brief", 12, 60 * 60 * 1000);
  if (limited) return limited;

  const { locale = "es", force = false } = await request.json().catch(() => ({ locale: "es", force: false }));
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
  const lang = locale === "es" ? "Spanish" : "English";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a senior digital marketing director for Instagram-led businesses. Generate a personalized daily brief that connects content, audience, offer, funnel stage, lead generation and conversion. Use ONLY provided context data. Make every action measurable and commercially useful. Respond in ${lang}. Return JSON only:
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
      },
      { role: "user", content: JSON.stringify(context) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.75,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return NextResponse.json({ error: "No AI response" }, { status: 500 });

  const brief = JSON.parse(content);
  await sb.from("daily_briefs").upsert({
    user_id: user.id,
    brief_date: today,
    brief,
  }, { onConflict: "user_id,brief_date" });

  return NextResponse.json({ brief, date: today, cached: false });
}

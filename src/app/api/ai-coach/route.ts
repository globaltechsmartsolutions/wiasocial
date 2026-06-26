import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { buildUserAIContext } from "@/lib/ai-context";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { getSupabaseForUser } from "@/lib/supabase-admin";

const COACH_SYSTEM = `You are WIA Growth Coach — a senior digital marketing consultant and Instagram growth strategist for creators, agencies and personal brands. Think like a professional marketer: diagnose the business goal, ICP, offer, funnel stage, positioning, content angle, conversion path and measurable KPI before recommending tactics. You have access to the user's real data context, including the latest AI Growth Radar when available. Use that radar as the strategic source of truth for priorities, experiments and recommendations. Be direct, actionable, and specific. Give practical marketing advice with clear next steps, test ideas, success metrics and conversion logic. Never suggest bots, fake followers, automated mass engagement, scraping or spam. Focus on positioning, content strategy, authority, lead generation, conversion and legal organic growth. Keep answers concise unless asked for detail.`;

export async function GET(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await getSupabaseForUser(token)
    .from("ai_coach_messages")
    .select("id, role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(40);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: Request) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI no configurada" }, { status: 503 });
  }

  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceUserRateLimit(request, user.id, "ai-coach", 40, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const { message, locale = "es" } = await request.json() as { message: string; locale?: string };
    if (!message?.trim()) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

    const sb = getSupabaseForUser(token);
    const context = await buildUserAIContext(user.id, token);

    const { data: history } = await sb
      .from("ai_coach_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12);

    const lang = locale === "es" ? "Spanish" : "English";
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `${COACH_SYSTEM}\n\nRespond in ${lang}.\n\nUSER CONTEXT:\n${JSON.stringify(context, null, 2)}`,
        },
        ...((history ?? []).reverse().map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content as string,
        }))),
        { role: "user", content: message },
      ],
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "No pude generar respuesta.";

    await sb.from("ai_coach_messages").insert([
      { user_id: user.id, role: "user", content: message },
      { user_id: user.id, role: "assistant", content: reply },
    ]);

    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Coach error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await getSupabaseForUser(token).from("ai_coach_messages").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}

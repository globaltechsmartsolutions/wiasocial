import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { buildUserAIContext } from "@/lib/ai-context";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { getSupabaseForUser } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI no configurada" }, { status: 503 });
  }

  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceUserRateLimit(request, user.id, "lead-iq", 40, 60 * 60 * 1000);
  if (limited) return limited;

  const { lead, locale = "es" } = await request.json();
  if (!lead?.id) return NextResponse.json({ error: "Lead requerido" }, { status: 400 });

  const context = await buildUserAIContext(user.id, token);
  const lang = locale === "es" ? "Spanish" : "English";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Act as a senior digital marketer and sales funnel strategist. Score this Instagram lead 0-100 for conversion likelihood using fit, intent, urgency, source, funnel stage and offer relevance. Recommend the next commercially useful action and write a natural DM that opens a conversation without spam or pressure. Respond in ${lang}. JSON only: { "score": number, "reasoning": string, "nextAction": string, "dmTemplate": string }`,
      },
      {
        role: "user",
        content: JSON.stringify({ lead, businessContext: context.settings }),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return NextResponse.json({ error: "No AI response" }, { status: 500 });

  const result = JSON.parse(content) as { score: number; reasoning: string; nextAction: string; dmTemplate: string };

  await getSupabaseForUser(token).from("lead_ai_scores").upsert({
    user_id: user.id,
    lead_id: lead.id,
    score: result.score,
    reasoning: result.reasoning,
    next_action: result.nextAction,
    dm_template: result.dmTemplate,
  }, { onConflict: "user_id,lead_id" });

  return NextResponse.json(result);
}

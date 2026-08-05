import { NextResponse } from "next/server";
import { respondToAIError } from "@/lib/ai/error-response";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { enforceAIUsage } from "@/lib/ai-usage-guard";
import { buildUserAIContext } from "@/lib/ai-context";
import { isOpenAIConfigured } from "@/lib/openai";
import { assertInputWithinTaskLimit, runLegacyJsonTask } from "@/lib/ai/legacy-call";
import { getSupabaseForUser } from "@/lib/supabase-admin";
import { readJsonObject } from "@/lib/request-validation";

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (err) {
    return respondToAIError(err, "lead-iq");
  }
}

async function handlePost(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceUserRateLimit(request, user.id, "lead-iq", 40, 60 * 60 * 1000);
  if (limited) return limited;
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI no configurada" }, { status: 503 });
  }

  const parsed = await readJsonObject<{ lead?: { id?: string }; locale?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const { lead, locale = "es" } = parsed.data;
  if (!lead?.id) return NextResponse.json({ error: "Lead requerido" }, { status: 400 });

  const context = await buildUserAIContext(user.id, token);

  // El tamaño se valida antes de tocar el contador de cuota.
  assertInputWithinTaskLimit("lead-iq", { lead });

  const usageBlocked = await enforceAIUsage(user.id, token);
  if (usageBlocked) return usageBlocked;

  const result = (await runLegacyJsonTask({
    taskId: "lead-iq",
    system:
      'Act as a senior digital marketer and sales funnel strategist. Score an Instagram lead 0-100 for conversion likelihood using fit, intent, urgency, source, funnel stage and offer relevance. Recommend the next commercially useful action and write a natural DM that opens a conversation without spam or pressure. JSON only: { "score": number, "reasoning": string, "nextAction": string, "dmTemplate": string }',
    instruction:
      "Score the lead described in user_input.lead, using the business settings in app_context.",
    input: { lead },
    context: { businessContext: context.settings },
    locale,
  })) as { score: number; reasoning: string; nextAction: string; dmTemplate: string };

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

import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { enforceAIUsage } from "@/lib/ai-usage-guard";
import { scoreInstagramProfile } from "@/lib/audit-scoring";
import { isOpenAIConfigured } from "@/lib/openai";
import { runLegacyJsonTask } from "@/lib/ai/legacy-call";
import { getSupabaseForUser } from "@/lib/supabase-admin";
import type { AuditAIReport, AuditProfileInput } from "@/types/audit";
import { readJsonObject } from "@/lib/request-validation";

const AUDIT_SYSTEM_PROMPT = `Actúa como un director de marketing digital especializado en Instagram, marca personal, agencias y captación de leads. Analiza el siguiente perfil con criterio profesional. No inventes datos. Usa únicamente la información proporcionada. Da recomendaciones concretas, directas y accionables para mejorar autoridad, claridad, conversión y captación de clientes.

Return JSON only:
{
  "generalDiagnosis": string,
  "mainErrors": string[],
  "recommendedChanges": string[],
  "proposedBio": string,
  "profilePhotoRecommendation": string,
  "highlightsRecommendation": string,
  "contentIdeas": string[],
  "reelHooks": string[],
  "commercialCTAs": string[],
  "sevenDayPlan": string[]
}`;

async function generateAIReport(
  input: AuditProfileInput,
  scores: ReturnType<typeof scoreInstagramProfile>,
  locale: string
): Promise<AuditAIReport | null> {
  if (!isOpenAIConfigured()) return null;

  const result = await runLegacyJsonTask({
    taskId: "instagram-audit",
    system: AUDIT_SYSTEM_PROMPT,
    instruction:
      "Audit the Instagram profile described in user_input.profile. The deterministic scoring computed by the app is in user_input.scoring.",
    input: { profile: input, scoring: scores },
    locale,
  });
  return result as AuditAIReport;
}

export async function POST(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
  const limited = await enforceUserRateLimit(request, user.id, "instagram-audit", 20, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const parsed = await readJsonObject<{
      input?: AuditProfileInput;
      locale?: string;
      skipAI?: boolean;
    }>(request);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data.input;
    const locale = parsed.data.locale ?? "es";
    const skipAI = Boolean(parsed.data.skipAI);

    if (!input?.username?.trim()) {
      return NextResponse.json({ error: "Username requerido" }, { status: 400 });
    }

    const scores = scoreInstagramProfile(input);
    if (!skipAI && isOpenAIConfigured()) {
      const usageBlocked = await enforceAIUsage(user.id, token);
      if (usageBlocked) return usageBlocked;
    }
    const aiReport = skipAI ? null : await generateAIReport(input, scores, locale);

    const sb = getSupabaseForUser(token);
    const { data, error } = await sb
      .from("instagram_audits")
      .insert({
        user_id: user.id,
        instagram_username: input.username.replace("@", ""),
        input_data: input,
        scores,
        ai_report: aiReport,
        growth_score: scores.growthScore,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: data.id,
      inputData: input,
      scores,
      aiReport,
      growthScore: scores.growthScore,
      createdAt: data.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const sb = getSupabaseForUser(token);

  if (id) {
    const { data, error } = await sb
      .from("instagram_audits")
      .select("*")
      .eq("user_id", user.id)
      .eq("id", id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({
      id: data.id,
      instagramUsername: data.instagram_username,
      inputData: data.input_data,
      scores: data.scores,
      aiReport: data.ai_report,
      growthScore: data.growth_score,
      createdAt: data.created_at,
    });
  }

  const { data, error } = await sb
    .from("instagram_audits")
    .select("id, instagram_username, growth_score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ audits: data ?? [] });
}

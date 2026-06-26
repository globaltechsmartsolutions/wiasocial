import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { buildUserAIContext } from "@/lib/ai-context";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { getSupabaseForUser } from "@/lib/supabase-admin";
import type { MonthlyMarketingPlan } from "@/types/marketing-os";

const PLAN_PROMPT = `You are a senior digital marketing strategist building a monthly Instagram marketing plan. Use only the provided context. Think in terms of positioning, ICP, offer, funnel stage, content pillars, conversion assets, experiments and KPIs.

Rules:
- Never recommend bots, spam, fake engagement, scraping or unverifiable tactics.
- Make the plan commercially useful for leads, sales, authority or follower growth.
- Every weekly campaign must include content across funnel stages and measurable KPIs.
- If data is thin, say so and use sensible assumptions based on settings.
- Return JSON only with this exact shape:
{
  "month": string,
  "objective": string,
  "positioningDiagnosis": string,
  "funnelStrategy": { "awareness": string, "authority": string, "conversion": string, "retention": string },
  "contentPillars": [{ "name": string, "role": string, "exampleTopics": string[] }],
  "weeklyCampaigns": [{ "week": number, "theme": string, "goal": string, "content": [{ "format": string, "topic": string, "hook": string, "cta": string }], "kpis": string[] }],
  "offerAngles": string[],
  "leadMagnets": string[],
  "measurementPlan": [{ "metric": string, "target": string, "whyItMatters": string }],
  "risks": string[]
}`;

export async function GET(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const month = getMonthStartDate();
  const { data, error } = await getSupabaseForUser(token)
    .from("monthly_marketing_plans")
    .select("plan_month, plan, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("plan_month", month)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ plan: null, setupRequired: true, message: "Ejecuta la migración marketing-os en Supabase." });
  }

  return NextResponse.json({
    plan: data?.plan ?? null,
    planMonth: data?.plan_month ?? month,
    createdAt: data?.created_at ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function POST(request: Request) {
  if (!isOpenAIConfigured()) return NextResponse.json({ error: "OpenAI no configurada" }, { status: 503 });

  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceUserRateLimit(request, user.id, "marketing-plan", 10, 60 * 60 * 1000);
  if (limited) return limited;

  const { locale = "es", objective = "leads", force = false } = await request.json().catch(() => ({}));
  const month = getMonthStartDate();
  const sb = getSupabaseForUser(token);

  if (!force) {
    const { data: existing } = await sb
      .from("monthly_marketing_plans")
      .select("plan_month, plan, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("plan_month", month)
      .maybeSingle();

    if (existing?.plan) {
      return NextResponse.json({ plan: existing.plan, planMonth: existing.plan_month, cached: true });
    }
  }

  const context = await buildUserAIContext(user.id, token);
  const lang = locale === "es" ? "Spanish" : "English";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: `${PLAN_PROMPT}\n\nRespond in ${lang}.` },
      { role: "user", content: JSON.stringify({ month, objective, context }) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.72,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return NextResponse.json({ error: "No AI response" }, { status: 500 });

  const plan = normalizePlan(JSON.parse(content) as Partial<MonthlyMarketingPlan>, month, String(objective));
  let persistenceWarning: string | null = null;

  const { error: upsertError } = await sb.from("monthly_marketing_plans").upsert({
    user_id: user.id,
    plan_month: month,
    objective,
    plan,
    context_snapshot: context,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,plan_month" });

  if (upsertError) {
    persistenceWarning = "Plan generado, pero falta ejecutar la migración marketing-os para guardarlo.";
  }

  return NextResponse.json({ plan, planMonth: month, cached: false, persistenceWarning });
}

function getMonthStartDate(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().split("T")[0];
}

function normalizePlan(plan: Partial<MonthlyMarketingPlan>, month: string, objective: string): MonthlyMarketingPlan {
  return {
    month: safeString(plan.month, month),
    objective: safeString(plan.objective, objective),
    positioningDiagnosis: safeString(plan.positioningDiagnosis, "Define una promesa clara y alinea el contenido con el objetivo comercial."),
    funnelStrategy: {
      awareness: safeString(plan.funnelStrategy?.awareness, "Aumentar alcance con temas de dolor y deseo del ICP."),
      authority: safeString(plan.funnelStrategy?.authority, "Demostrar criterio con casos, frameworks y pruebas."),
      conversion: safeString(plan.funnelStrategy?.conversion, "Convertir conversaciones con CTAs claros a DM o llamada."),
      retention: safeString(plan.funnelStrategy?.retention, "Reforzar confianza con resultados, comunidad y seguimiento."),
    },
    contentPillars: (plan.contentPillars ?? []).slice(0, 5).map((pillar) => ({
      name: safeString(pillar.name, "Pilar de contenido"),
      role: safeString(pillar.role, "Mover al usuario por el funnel."),
      exampleTopics: (pillar.exampleTopics ?? []).slice(0, 5).map((topic) => safeString(topic, "Tema")),
    })),
    weeklyCampaigns: (plan.weeklyCampaigns ?? []).slice(0, 5).map((campaign, index) => ({
      week: Number(campaign.week) || index + 1,
      theme: safeString(campaign.theme, "Campaña semanal"),
      goal: safeString(campaign.goal, "Generar demanda cualificada."),
      content: (campaign.content ?? []).slice(0, 5).map((item) => ({
        format: safeString(item.format, "Reel"),
        topic: safeString(item.topic, "Tema estratégico"),
        hook: safeString(item.hook, "Gancho orientado al problema del cliente"),
        cta: safeString(item.cta, "Enviar DM"),
      })),
      kpis: (campaign.kpis ?? []).slice(0, 5).map((kpi) => safeString(kpi, "Leads generados")),
    })),
    offerAngles: (plan.offerAngles ?? []).slice(0, 6).map((angle) => safeString(angle, "Angulo de oferta")),
    leadMagnets: (plan.leadMagnets ?? []).slice(0, 5).map((leadMagnet) => safeString(leadMagnet, "Lead magnet")),
    measurementPlan: (plan.measurementPlan ?? []).slice(0, 6).map((metric) => ({
      metric: safeString(metric.metric, "Metric"),
      target: safeString(metric.target, "Objetivo"),
      whyItMatters: safeString(metric.whyItMatters, "Conecta actividad con resultado comercial."),
    })),
    risks: (plan.risks ?? []).slice(0, 5).map((risk) => safeString(risk, "Riesgo a controlar")),
  };
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

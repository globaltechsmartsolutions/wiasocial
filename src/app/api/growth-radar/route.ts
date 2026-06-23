import { NextResponse } from "next/server";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { buildUserAIContext } from "@/lib/ai-context";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { getSupabaseForUser } from "@/lib/supabase-admin";
import type { GrowthRadarReport } from "@/types/growth-radar";

const RADAR_SYSTEM_PROMPT = `You are WIA Growth Radar, a senior digital marketing strategist specialized in Instagram growth, funnels, positioning and lead generation. Analyze only the provided user context and return a practical weekly growth radar with the judgment of a professional marketer.

Rules:
- Never recommend bots, fake followers, automated mass engagement, scraping, or spam.
- Prioritize actions that can be executed this week.
- If Instagram is not connected or data is thin, be transparent and use manual data/settings.
- Keep recommendations specific to the user's niche, offer, leads, posts, and available Instagram metrics.
- Tie every recommendation to a marketing objective: awareness, authority, engagement, lead generation, conversion, retention, or offer validation.
- Include measurable success metrics and explain the conversion logic behind the highest-priority actions.
- Return JSON only with this exact shape:
{
  "opportunityScore": number,
  "headline": string,
  "executiveSummary": string,
  "biggestOpportunity": string,
  "keySignals": [{ "label": string, "value": string, "interpretation": string }],
  "recommendations": [{ "title": string, "priority": "high" | "medium" | "low", "why": string, "action": string, "expectedImpact": string }],
  "experiments": [{ "name": string, "hypothesis": string, "steps": string[], "successMetric": string }],
  "contentPlan": { "format": string, "topic": string, "hook": string, "cta": string },
  "engagementPlay": string,
  "leadPlay": string,
  "riskAlerts": string[]
}`;

export async function GET(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseForUser(token);
  const { data, error } = await sb
    .from("growth_radar_reports")
    .select("id, report_week, report, created_at, updated_at")
    .eq("user_id", user.id)
    .order("report_week", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ report: null, setupRequired: true, message: "Ejecuta la migración growth-radar en Supabase." });
  }

  return NextResponse.json({
    report: data?.report ?? null,
    reportWeek: data?.report_week ?? null,
    createdAt: data?.created_at ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function POST(request: Request) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI no configurada" }, { status: 503 });
  }

  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { locale = "es", force = false } = await request.json().catch(() => ({ locale: "es", force: false }));
  const reportWeek = getWeekStartDate();
  const sb = getSupabaseForUser(token);

  if (!force) {
    const { data: existing } = await sb
      .from("growth_radar_reports")
      .select("report, report_week, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("report_week", reportWeek)
      .maybeSingle();

    if (existing?.report) {
      return NextResponse.json({
        report: existing.report,
        reportWeek: existing.report_week,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
        cached: true,
      });
    }
  }

  const context = await buildUserAIContext(user.id, token);
  const lang = locale === "es" ? "Spanish" : "English";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `${RADAR_SYSTEM_PROMPT}\n\nRespond in ${lang}.`,
      },
      { role: "user", content: JSON.stringify({ reportWeek, context }) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return NextResponse.json({ error: "No AI response" }, { status: 500 });

  const report = normalizeReport(JSON.parse(content) as Partial<GrowthRadarReport>);
  let persistenceWarning: string | null = null;

  const { error: upsertError } = await sb.from("growth_radar_reports").upsert({
    user_id: user.id,
    report_week: reportWeek,
    opportunity_score: report.opportunityScore,
    report,
    context_snapshot: context,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,report_week" });

  if (upsertError) {
    persistenceWarning = "Reporte generado, pero falta ejecutar la migración growth-radar en Supabase para guardarlo.";
  }

  return NextResponse.json({
    report,
    reportWeek,
    cached: false,
    persistenceWarning,
  });
}

function getWeekStartDate(date = new Date()): string {
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() - day + 1);
  return current.toISOString().split("T")[0];
}

function normalizeReport(report: Partial<GrowthRadarReport>): GrowthRadarReport {
  const opportunityScore = clampScore(report.opportunityScore);

  return {
    opportunityScore,
    headline: safeString(report.headline, "Radar IA listo"),
    executiveSummary: safeString(report.executiveSummary, "Analisis semanal generado con los datos disponibles."),
    biggestOpportunity: safeString(report.biggestOpportunity, "Mejorar consistencia y conversion desde el contenido."),
    keySignals: (report.keySignals ?? []).slice(0, 6).map((signal) => ({
      label: safeString(signal.label, "Senal"),
      value: safeString(signal.value, "-"),
      interpretation: safeString(signal.interpretation, "Revisar esta senal esta semana."),
    })),
    recommendations: (report.recommendations ?? []).slice(0, 5).map((rec) => ({
      title: safeString(rec.title, "Recomendacion"),
      priority: rec.priority === "low" || rec.priority === "medium" || rec.priority === "high" ? rec.priority : "medium",
      why: safeString(rec.why, "Basado en tus datos disponibles."),
      action: safeString(rec.action, "Ejecuta una accion concreta esta semana."),
      expectedImpact: safeString(rec.expectedImpact, "Mejorar crecimiento organico y conversion."),
    })),
    experiments: (report.experiments ?? []).slice(0, 4).map((experiment) => ({
      name: safeString(experiment.name, "Experimento semanal"),
      hypothesis: safeString(experiment.hypothesis, "Este test puede revelar una oportunidad."),
      steps: (experiment.steps ?? []).slice(0, 5).map((step) => safeString(step, "Ejecutar paso")).filter(Boolean),
      successMetric: safeString(experiment.successMetric, "Comparar engagement y leads generados."),
    })),
    contentPlan: {
      format: safeString(report.contentPlan?.format, "Reel"),
      topic: safeString(report.contentPlan?.topic, "Tema de autoridad del nicho"),
      hook: safeString(report.contentPlan?.hook, "El error que te esta frenando en Instagram"),
      cta: safeString(report.contentPlan?.cta, "Envia DM para recibir ayuda"),
    },
    engagementPlay: safeString(report.engagementPlay, "Interactua manualmente con cuentas de tu nicho durante 15 minutos."),
    leadPlay: safeString(report.leadPlay, "Prioriza leads con senales de compra y agenda conversaciones."),
    riskAlerts: (report.riskAlerts ?? []).slice(0, 4).map((alert) => safeString(alert, "Riesgo a revisar")),
  };
}

function clampScore(value: unknown): number {
  const score = Number(value);
  if (!Number.isFinite(score)) return 50;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

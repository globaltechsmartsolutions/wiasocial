import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { buildUserAIContext } from "@/lib/ai-context";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { getSupabaseForUser } from "@/lib/supabase-admin";
import type {
  AudienceFinderReport,
  AudienceSegment,
  PotentialFollowerCandidate,
  PotentialFollowerInterestLevel,
} from "@/types/audience-finder";

const AUDIENCE_FINDER_PROMPT = `You are WIA Audience Finder, a senior Instagram growth strategist.

Goal:
Build a legal, production-safe radar of potential followers for a specific niche. The user wants people likely to care about their content and potentially follow them back.

Hard rules:
- Never claim access to private Instagram data.
- Never say a person liked, saved, watched, or followed third-party content unless the user explicitly provided that public/manual observation.
- Never suggest bots, scraping, automation, mass following, spam, or fake engagement.
- If the user provides observed usernames, score only those usernames using public/manual signals and strategic fit.
- If no usernames are provided, do not invent real handles. Return candidate archetypes with username null and displayName like "Perfil tipo: inversor principiante".
- Focus on legal signals: public comments, bio keywords, content themes, similar accounts provided by the user, hashtags/topics, user's own audience/leads, and manual observations.
- Recommend manual, high-quality engagement actions.
- Return JSON only with this exact shape:
{
  "niche": string,
  "headline": string,
  "summary": string,
  "confidenceNote": string,
  "searchAngles": string[],
  "segments": [{ "name": string, "whyItFits": string, "publicSignals": string[], "whereToFind": string[] }],
  "candidates": [{
    "username": string | null,
    "displayName": string,
    "fitScore": number,
    "interestLevel": "high" | "medium" | "low",
    "sourceType": "manual_public_interaction" | "similar_account" | "hashtag_topic" | "own_audience",
    "nicheSignals": string[],
    "interactionSignals": string[],
    "correlationReason": string,
    "sourceHint": string,
    "recommendedAction": string,
    "openingComment": string,
    "dmAngle": string
  }],
  "engagementPlan": string[],
  "dmTemplate": string,
  "complianceNotes": string[]
}`;

interface AudienceFinderPayload {
  locale?: string;
  niche?: string;
  goal?: string;
  similarAccounts?: string;
  keywords?: string;
  observedUsers?: string;
  notes?: string;
}

export async function GET(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await getSupabaseForUser(token)
    .from("audience_finder_reports")
    .select("id, niche, goal, input_snapshot, report, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({
      report: null,
      setupRequired: true,
      message: "Ejecuta la migración audience-finder en Supabase.",
    });
  }

  return NextResponse.json({
    id: data?.id ?? null,
    report: data?.report ?? null,
    input: data?.input_snapshot ?? null,
    createdAt: data?.created_at ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function POST(request: Request) {
  if (!isOpenAIConfigured()) return NextResponse.json({ error: "OpenAI no configurada" }, { status: 503 });

  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceUserRateLimit(request, user.id, "audience-finder", 15, 60 * 60 * 1000);
  if (limited) return limited;

  const payload = (await request.json().catch(() => ({}))) as AudienceFinderPayload;
  const locale = payload.locale === "en" ? "en" : "es";
  const niche = safeString(payload.niche, "");
  if (!niche) return NextResponse.json({ error: "Nicho requerido" }, { status: 400 });

  const input = {
    niche,
    goal: safeString(payload.goal, "seguidores cualificados"),
    similarAccounts: splitLines(payload.similarAccounts),
    keywords: splitComma(payload.keywords),
    observedUsers: splitLines(payload.observedUsers),
    notes: safeString(payload.notes, ""),
  };

  const context = await buildUserAIContext(user.id, token);
  const lang = locale === "es" ? "Spanish" : "English";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: `${AUDIENCE_FINDER_PROMPT}\n\nRespond in ${lang}.` },
      { role: "user", content: JSON.stringify({ input, context }) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.68,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return NextResponse.json({ error: "No AI response" }, { status: 500 });

  const report = normalizeReport(JSON.parse(content) as Partial<AudienceFinderReport>, input.niche);
  let persistenceWarning: string | null = null;
  const sb = getSupabaseForUser(token);

  const { data, error: insertError } = await sb
    .from("audience_finder_reports")
    .insert({
      user_id: user.id,
      niche: input.niche,
      goal: input.goal,
      input_snapshot: input,
      report,
      context_snapshot: context,
      updated_at: new Date().toISOString(),
    })
    .select("id, created_at, updated_at")
    .single();

  if (insertError) {
    persistenceWarning = "Radar generado, pero falta ejecutar la migración audience-finder para guardarlo.";
  }

  return NextResponse.json({
    id: data?.id ?? null,
    report,
    input,
    createdAt: data?.created_at ?? null,
    updatedAt: data?.updated_at ?? null,
    persistenceWarning,
  });
}

function normalizeReport(report: Partial<AudienceFinderReport>, niche: string): AudienceFinderReport {
  return {
    niche: safeString(report.niche, niche),
    headline: safeString(report.headline, "Radar de seguidores potenciales listo"),
    summary: safeString(report.summary, "Analisis generado con las senales disponibles."),
    confidenceNote: safeString(
      report.confidenceNote,
      "La afinidad es una estimacion basada en datos publicos/manuales y contexto de la cuenta."
    ),
    searchAngles: (report.searchAngles ?? []).slice(0, 8).map((angle) => safeString(angle, "Angulo de busqueda")),
    segments: (report.segments ?? []).slice(0, 5).map(normalizeSegment),
    candidates: (report.candidates ?? []).slice(0, 12).map(normalizeCandidate),
    engagementPlan: (report.engagementPlan ?? []).slice(0, 7).map((step) => safeString(step, "Interactuar de forma manual y relevante.")),
    dmTemplate: safeString(report.dmTemplate, "Hola {nombre}, vi que te interesa este tema y queria conectar por aqui."),
    complianceNotes: (report.complianceNotes ?? []).slice(0, 5).map((note) => safeString(note, "No usar bots ni scraping.")),
  };
}

function normalizeSegment(segment: Partial<AudienceSegment>): AudienceSegment {
  return {
    name: safeString(segment.name, "Segmento de audiencia"),
    whyItFits: safeString(segment.whyItFits, "Tiene relacion con el nicho y puede interesarse por la cuenta."),
    publicSignals: (segment.publicSignals ?? []).slice(0, 5).map((signal) => safeString(signal, "Senal publica")),
    whereToFind: (segment.whereToFind ?? []).slice(0, 5).map((place) => safeString(place, "Cuenta, hashtag o comentario publico")),
  };
}

function normalizeCandidate(candidate: Partial<PotentialFollowerCandidate>): PotentialFollowerCandidate {
  const username = typeof candidate.username === "string" && candidate.username.trim()
    ? normalizeUsername(candidate.username)
    : null;

  return {
    username,
    displayName: safeString(candidate.displayName, username ?? "Perfil tipo"),
    fitScore: clampScore(candidate.fitScore),
    interestLevel: normalizeInterest(candidate.interestLevel),
    sourceType: normalizeSourceType(candidate.sourceType),
    nicheSignals: (candidate.nicheSignals ?? []).slice(0, 5).map((signal) => safeString(signal, "Interes del nicho")),
    interactionSignals: (candidate.interactionSignals ?? []).slice(0, 5).map((signal) => safeString(signal, "Senal publica/manual")),
    correlationReason: safeString(candidate.correlationReason, "Alta relacion entre sus intereses y el contenido de tu cuenta."),
    sourceHint: safeString(candidate.sourceHint, "Buscar en comentarios publicos, hashtags o cuentas similares."),
    recommendedAction: safeString(candidate.recommendedAction, "Seguir e interactuar manualmente con una respuesta util."),
    openingComment: safeString(candidate.openingComment, "Buen punto. Esto conecta mucho con..."),
    dmAngle: safeString(candidate.dmAngle, "Abrir conversacion con una pregunta util, sin venta directa."),
  };
}

function normalizeInterest(value: unknown): PotentialFollowerInterestLevel {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function normalizeSourceType(value: unknown): PotentialFollowerCandidate["sourceType"] {
  return value === "manual_public_interaction" ||
    value === "similar_account" ||
    value === "hashtag_topic" ||
    value === "own_audience"
    ? value
    : "hashtag_topic";
}

function clampScore(value: unknown): number {
  const score = Number(value);
  if (!Number.isFinite(score)) return 50;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function splitLines(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function splitComma(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function normalizeUsername(value: string): string {
  const clean = value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  return clean.startsWith("@") ? clean : `@${clean}`;
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

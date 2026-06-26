import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { buildUserAIContext } from "@/lib/ai-context";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import { getSupabaseForUser } from "@/lib/supabase-admin";
import type { InstagramFunnelPlan } from "@/types/marketing-os";

const FUNNEL_PROMPT = `You are a senior digital marketing consultant building an Instagram funnel for a creator, agency or personal brand. Use the provided business context and requested offer to build a conversion system.

Rules:
- No spam, bots, scraping, fake urgency or manipulative pressure.
- Make the funnel usable manually by a real business owner.
- Connect profile, content, stories, DMs, follow-ups and calls into one conversion path.
- Return JSON only with this exact shape:
{
  "offer": string,
  "targetAudience": string,
  "funnelGoal": string,
  "positioning": string,
  "profileConversion": { "bio": string, "highlights": string[], "pinnedPosts": string[] },
  "leadMagnet": { "title": string, "promise": string, "delivery": string },
  "dmKeyword": string,
  "contentSequence": [{ "stage": "awareness" | "authority" | "trust" | "conversion", "format": string, "topic": string, "hook": string, "cta": string }],
  "storySequence": [{ "slide": number, "goal": string, "copy": string }],
  "dmScripts": [{ "situation": string, "message": string }],
  "followUpSequence": [{ "day": number, "objective": string, "message": string }],
  "callScript": string[],
  "successMetrics": string[]
}`;

export async function GET(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await getSupabaseForUser(token)
    .from("instagram_funnels")
    .select("id, funnel, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ funnel: null, setupRequired: true, message: "Ejecuta la migración marketing-os en Supabase." });
  }

  return NextResponse.json({
    funnel: data?.funnel ?? null,
    id: data?.id ?? null,
    createdAt: data?.created_at ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function POST(request: Request) {
  if (!isOpenAIConfigured()) return NextResponse.json({ error: "OpenAI no configurada" }, { status: 503 });

  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceUserRateLimit(request, user.id, "funnel-builder", 15, 60 * 60 * 1000);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const {
    locale = "es",
    offer = "",
    targetAudience = "",
    funnelGoal = "leads",
  } = body as { locale?: string; offer?: string; targetAudience?: string; funnelGoal?: string };

  const context = await buildUserAIContext(user.id, token);
  const lang = locale === "es" ? "Spanish" : "English";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: `${FUNNEL_PROMPT}\n\nRespond in ${lang}.` },
      { role: "user", content: JSON.stringify({ offer, targetAudience, funnelGoal, context }) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.72,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return NextResponse.json({ error: "No AI response" }, { status: 500 });

  const funnel = normalizeFunnel(JSON.parse(content) as Partial<InstagramFunnelPlan>, offer, targetAudience, funnelGoal);
  const { data, error } = await getSupabaseForUser(token)
    .from("instagram_funnels")
    .insert({
      user_id: user.id,
      offer: funnel.offer,
      target_audience: funnel.targetAudience,
      funnel_goal: funnel.funnelGoal,
      funnel,
      context_snapshot: context,
    })
    .select("id, created_at")
    .single();

  return NextResponse.json({
    funnel,
    id: data?.id ?? null,
    createdAt: data?.created_at ?? null,
    persistenceWarning: error ? "Funnel generado, pero falta ejecutar la migración marketing-os para guardarlo." : null,
  });
}

function normalizeFunnel(
  funnel: Partial<InstagramFunnelPlan>,
  offer: string,
  targetAudience: string,
  funnelGoal: string
): InstagramFunnelPlan {
  return {
    offer: safeString(funnel.offer, offer || "Oferta principal"),
    targetAudience: safeString(funnel.targetAudience, targetAudience || "Audiencia objetivo"),
    funnelGoal: safeString(funnel.funnelGoal, funnelGoal),
    positioning: safeString(funnel.positioning, "Posicionar la oferta como la forma más clara de resolver un problema urgente del ICP."),
    profileConversion: {
      bio: safeString(funnel.profileConversion?.bio, "Ayudo a [ICP] a conseguir [resultado] sin [dolor]. DM para empezar."),
      highlights: (funnel.profileConversion?.highlights ?? []).slice(0, 6).map((item) => safeString(item, "Highlight")),
      pinnedPosts: (funnel.profileConversion?.pinnedPosts ?? []).slice(0, 3).map((item) => safeString(item, "Post fijado")),
    },
    leadMagnet: {
      title: safeString(funnel.leadMagnet?.title, "Checklist gratuito"),
      promise: safeString(funnel.leadMagnet?.promise, "Resolver un problema concreto y activar una conversación."),
      delivery: safeString(funnel.leadMagnet?.delivery, "DM manual con palabra clave."),
    },
    dmKeyword: safeString(funnel.dmKeyword, "GUIA").toUpperCase(),
    contentSequence: (funnel.contentSequence ?? []).slice(0, 8).map((item) => ({
      stage: item.stage === "authority" || item.stage === "trust" || item.stage === "conversion" ? item.stage : "awareness",
      format: safeString(item.format, "Reel"),
      topic: safeString(item.topic, "Tema del funnel"),
      hook: safeString(item.hook, "Gancho"),
      cta: safeString(item.cta, "Enviar DM"),
    })),
    storySequence: (funnel.storySequence ?? []).slice(0, 7).map((slide, index) => ({
      slide: Number(slide.slide) || index + 1,
      goal: safeString(slide.goal, "Mover al siguiente paso"),
      copy: safeString(slide.copy, "Copy de story"),
    })),
    dmScripts: (funnel.dmScripts ?? []).slice(0, 6).map((script) => ({
      situation: safeString(script.situation, "Situacion"),
      message: safeString(script.message, "Mensaje"),
    })),
    followUpSequence: (funnel.followUpSequence ?? []).slice(0, 5).map((followUp, index) => ({
      day: Number(followUp.day) || index + 1,
      objective: safeString(followUp.objective, "Reactivar conversación"),
      message: safeString(followUp.message, "Mensaje de seguimiento"),
    })),
    callScript: (funnel.callScript ?? []).slice(0, 8).map((line) => safeString(line, "Pregunta de llamada")),
    successMetrics: (funnel.successMetrics ?? []).slice(0, 6).map((metric) => safeString(metric, "Métrica")),
  };
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

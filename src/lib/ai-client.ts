import { getSupabase } from "@/lib/supabase";
import type { GrowthRadarReport } from "@/types/growth-radar";
import type { InstagramFunnelPlan, MonthlyMarketingPlan } from "@/types/marketing-os";

export async function callAI(action: string, params: Record<string, unknown> = {}, locale = "es") {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, locale, ...params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "AI request failed");
  return data;
}

async function getToken() {
  const { data: { session } } = await getSupabase().auth.getSession();
  if (!session?.access_token) throw new Error("No hay sesión activa");
  return session.access_token;
}

export interface DailyBrief {
  headline: string;
  focus: string;
  priorityActions: string[];
  contentIdea: { format: string; hook: string; cta: string };
  engagementTask: string;
  leadAction: string;
  growthTip: string;
  motivation: string;
}

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface LeadIQResult {
  score: number;
  reasoning: string;
  nextAction: string;
  dmTemplate: string;
}

export interface GrowthRadarResponse {
  report: GrowthRadarReport | null;
  reportWeek: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  cached?: boolean;
  setupRequired?: boolean;
  message?: string;
  persistenceWarning?: string | null;
}

export interface MarketingPlanResponse {
  plan: MonthlyMarketingPlan | null;
  planMonth: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  cached?: boolean;
  setupRequired?: boolean;
  message?: string;
  persistenceWarning?: string | null;
}

export interface FunnelBuilderResponse {
  funnel: InstagramFunnelPlan | null;
  id?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  setupRequired?: boolean;
  message?: string;
  persistenceWarning?: string | null;
}

export async function fetchCoachMessages() {
  const token = await getToken();
  const res = await fetch("/api/ai-coach", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al cargar mensajes");
  return data.messages as CoachMessage[];
}

export async function sendCoachMessage(message: string, locale = "es") {
  const token = await getToken();
  const res = await fetch("/api/ai-coach", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, locale }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error del coach");
  return data.reply as string;
}

export async function clearCoachHistory() {
  const token = await getToken();
  const res = await fetch("/api/ai-coach", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Error al limpiar historial");
  }
}

export async function fetchDailyBrief() {
  const token = await getToken();
  const res = await fetch("/api/daily-brief", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al cargar brief");
  return { brief: data.brief as DailyBrief | null, date: data.date as string };
}

export async function generateDailyBrief(locale = "es") {
  const token = await getToken();
  const res = await fetch("/api/daily-brief", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ locale }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al generar brief");
  return { brief: data.brief as DailyBrief, date: data.date as string, cached: data.cached as boolean };
}

export async function scoreLead(lead: Record<string, unknown>, locale = "es") {
  const token = await getToken();
  const res = await fetch("/api/lead-iq", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lead, locale }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al puntuar lead");
  return data as LeadIQResult;
}

export async function fetchGrowthRadar() {
  const token = await getToken();
  const res = await fetch("/api/growth-radar", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al cargar Radar IA");
  return data as GrowthRadarResponse;
}

export async function generateGrowthRadar(locale = "es", force = false) {
  const token = await getToken();
  const res = await fetch("/api/growth-radar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ locale, force }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al generar Radar IA");
  return data as GrowthRadarResponse;
}

export async function fetchMarketingPlan() {
  const token = await getToken();
  const res = await fetch("/api/marketing-plan", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al cargar plan de marketing");
  return data as MarketingPlanResponse;
}

export async function generateMarketingPlan(locale = "es", objective = "leads", force = false) {
  const token = await getToken();
  const res = await fetch("/api/marketing-plan", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ locale, objective, force }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al generar plan de marketing");
  return data as MarketingPlanResponse;
}

export async function fetchLatestFunnel() {
  const token = await getToken();
  const res = await fetch("/api/funnel-builder", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al cargar funnel");
  return data as FunnelBuilderResponse;
}

export async function generateFunnel(
  payload: { offer: string; targetAudience: string; funnelGoal: string },
  locale = "es"
) {
  const token = await getToken();
  const res = await fetch("/api/funnel-builder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, locale }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al generar funnel");
  return data as FunnelBuilderResponse;
}

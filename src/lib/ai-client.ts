import { getSupabase } from "@/lib/supabase";

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

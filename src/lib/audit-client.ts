import { getSupabase } from "@/lib/supabase";
import type { AuditAIReport, AuditProfileInput, AuditScoringResult } from "@/types/audit";

async function getToken() {
  const { data: { session } } = await getSupabase().auth.getSession();
  if (!session?.access_token) throw new Error("No hay sesión activa");
  return session.access_token;
}

export async function runInstagramAudit(input: AuditProfileInput, locale = "es", skipAI = false) {
  const token = await getToken();
  const res = await fetch("/api/instagram-audit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input, locale, skipAI }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error en auditoría");
  return data as {
    id: string;
    inputData: AuditProfileInput;
    scores: AuditScoringResult;
    aiReport: AuditAIReport | null;
    growthScore: number;
    createdAt: string;
  };
}

export async function fetchAuditHistory() {
  const token = await getToken();
  const res = await fetch("/api/instagram-audit", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al cargar historial");
  return data.audits as { id: string; instagram_username: string; growth_score: number; created_at: string }[];
}

export async function fetchAuditById(id: string) {
  const token = await getToken();
  const res = await fetch(`/api/instagram-audit?id=${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Auditoría no encontrada");
  return data as {
    id: string;
    instagramUsername: string;
    inputData: AuditProfileInput;
    scores: AuditScoringResult;
    aiReport: AuditAIReport | null;
    growthScore: number;
    createdAt: string;
  };
}

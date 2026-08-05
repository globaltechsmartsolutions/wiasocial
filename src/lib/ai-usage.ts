import "server-only";

import { getSupabaseAdmin, getSupabaseForUser } from "@/lib/supabase-admin";

export interface PlanUsagePolicy {
  /** Hard monthly ceiling. Always finite, including on commercially unlimited plans. */
  limit: number;
  /** Whether the UI should present the plan as unlimited. */
  displayUnlimited: boolean;
}

// Paid plans are sold as unlimited, but an unmetered plan has no margin control
// and no way to spot an abusive account. The ceiling is a fair-use guard set well
// above normal usage; `displayUnlimited` keeps the commercial promise in the UI.
const DEFAULT_POLICIES: Record<string, PlanUsagePolicy> = {
  free: { limit: 5, displayUnlimited: false },
  starter: { limit: 500, displayUnlimited: true },
  agency: { limit: 2000, displayUnlimited: true },
};

function envLimitOverride(plan: string): number | null {
  const raw = process.env[`AI_LIMIT_${plan.toUpperCase()}`]?.trim();
  if (!raw) return null;
  // Number() instead of parseInt(): parseInt("12.5") silently yields 12.
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getPlanUsagePolicy(plan: string): PlanUsagePolicy {
  const base = DEFAULT_POLICIES[plan] ?? DEFAULT_POLICIES.free;
  return { ...base, limit: envLimitOverride(plan) ?? base.limit };
}

export function currentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export class UsageLimitError extends Error {
  used: number;
  limit: number;
  constructor(used: number, limit: number) {
    super("USAGE_LIMIT_EXCEEDED");
    this.name = "UsageLimitError";
    this.used = used;
    this.limit = limit;
  }
}

/**
 * The counter could not be read or written. Thrown instead of letting the
 * request through: a spending control that fails open is not a control.
 */
export class UsageBackendError extends Error {
  constructor(detail: string) {
    super(`AI_USAGE_UNAVAILABLE: ${detail}`);
    this.name = "UsageBackendError";
  }
}

export interface UsageState {
  used: number;
  limit: number;
  unlimited: boolean;
}

async function getUserPlan(userId: string, token: string): Promise<string> {
  const sb = getSupabaseForUser(token);
  const { data } = await sb
    .from("user_settings")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.plan as string | null) ?? "free";
}

export async function checkAndIncrementAIUsage(
  userId: string,
  token: string
): Promise<UsageState> {
  const monthKey = currentMonthKey();
  const plan = await getUserPlan(userId, token);
  const policy = getPlanUsagePolicy(plan);
  const sb = getSupabaseForUser(token);

  // The RPC checks the limit and increments in the same transaction, so two
  // concurrent generations cannot both pass the last remaining slot.
  const { data, error } = await sb.rpc("increment_ai_usage", {
    p_user_id: userId,
    p_month_key: monthKey,
    p_limit: policy.limit,
  });

  if (error) {
    throw new UsageBackendError(
      `${error.message}. Ejecuta 'npm run migrate:all' si la función no existe.`
    );
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { used?: number; incremented?: boolean }
    | null
    | undefined;
  const used = Number(row?.used);

  if (!Number.isFinite(used) || typeof row?.incremented !== "boolean") {
    throw new UsageBackendError("respuesta inesperada de increment_ai_usage");
  }

  if (!row.incremented) {
    throw new UsageLimitError(used, policy.limit);
  }

  return { used, limit: policy.limit, unlimited: policy.displayUnlimited };
}

export interface UsageReservation extends UsageState {
  reservationId: string;
  monthKey: string;
}

/**
 * Reserva identificada para el flujo migrado: incrementa el contador y crea
 * una fila `reserved` en la misma transacción (RPC `reserve_ai_usage`). La
 * reserva solo puede confirmarse o liberarse UNA vez, mediante la transición
 * atómica de estado de esa fila concreta.
 *
 * Las RPC de cuota se invocan con service role: el cliente no tiene permiso de
 * ejecución para que no pueda liberar su propia reserva en vuelo. `userId`
 * procede siempre del token ya verificado en la ruta.
 */
export async function reserveAIUsage(userId: string, token: string): Promise<UsageReservation> {
  const monthKey = currentMonthKey();
  const plan = await getUserPlan(userId, token);
  const policy = getPlanUsagePolicy(plan);
  const sb = getSupabaseAdmin();

  const { data, error } = await sb.rpc("reserve_ai_usage", {
    p_user_id: userId,
    p_month_key: monthKey,
    p_limit: policy.limit,
  });

  if (error) {
    throw new UsageBackendError(
      `${error.message}. Ejecuta 'npm run migrate:ai-core' si la función no existe.`
    );
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { reservation_id?: string | null; used?: number; reserved?: boolean }
    | null
    | undefined;
  const used = Number(row?.used);

  if (!Number.isFinite(used) || typeof row?.reserved !== "boolean") {
    throw new UsageBackendError("respuesta inesperada de reserve_ai_usage");
  }

  if (!row.reserved || !row.reservation_id) {
    throw new UsageLimitError(used, policy.limit);
  }

  return {
    reservationId: row.reservation_id,
    monthKey,
    used,
    limit: policy.limit,
    unlimited: policy.displayUnlimited,
  };
}

export async function getMonthlyUsage(
  userId: string,
  token: string
): Promise<UsageState & { monthKey: string }> {
  const monthKey = currentMonthKey();
  const plan = await getUserPlan(userId, token);
  const policy = getPlanUsagePolicy(plan);

  const sb = getSupabaseForUser(token);
  const { data } = await sb
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("month_key", monthKey)
    .maybeSingle();

  return {
    used: (data?.count as number | null) ?? 0,
    limit: policy.limit,
    unlimited: policy.displayUnlimited,
    monthKey,
  };
}

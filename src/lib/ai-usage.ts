import { getSupabaseForUser } from "@/lib/supabase-admin";

export const AI_LIMITS: Record<string, number> = {
  free: 5,
  starter: Infinity,
  agency: Infinity,
};

function currentMonthKey() {
  const now = new Date();
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
): Promise<{ used: number; limit: number }> {
  const monthKey = currentMonthKey();
  const plan = await getUserPlan(userId, token);
  const limit = AI_LIMITS[plan] ?? AI_LIMITS.free;

  if (limit === Infinity) return { used: 0, limit: Infinity };

  const sb = getSupabaseForUser(token);

  // Call the atomic RPC that inserts or increments and returns new count
  const { data, error } = await sb.rpc("increment_ai_usage", {
    p_user_id: userId,
    p_month_key: monthKey,
  });

  if (error) {
    // If RPC doesn't exist yet, fall back to a simple count check
    const { data: row } = await sb
      .from("ai_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("month_key", monthKey)
      .maybeSingle();
    const current = (row?.count as number | null) ?? 0;
    if (current >= limit) throw new UsageLimitError(current, limit);
    await sb.from("ai_usage").upsert(
      { user_id: userId, month_key: monthKey, count: current + 1, updated_at: new Date().toISOString() },
      { onConflict: "user_id,month_key" }
    );
    return { used: current + 1, limit };
  }

  const newCount = data as number;
  if (newCount > limit) throw new UsageLimitError(newCount, limit);

  return { used: newCount, limit };
}

export async function getMonthlyUsage(
  userId: string,
  token: string
): Promise<{ used: number; limit: number; monthKey: string }> {
  const monthKey = currentMonthKey();
  const plan = await getUserPlan(userId, token);
  const limit = AI_LIMITS[plan] ?? AI_LIMITS.free;

  const sb = getSupabaseForUser(token);
  const { data } = await sb
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("month_key", monthKey)
    .maybeSingle();

  return { used: (data?.count as number | null) ?? 0, limit, monthKey };
}

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfter: number;
}

interface SupabaseRateLimitRow {
  ok: boolean;
  remaining: number;
  retry_after: number;
}

const buckets = new Map<string, Bucket>();

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const sharedResult = await checkSharedRateLimit(options);
  return sharedResult ?? checkMemoryRateLimit(options);
}

async function checkSharedRateLimit({ key, limit, windowMs }: RateLimitOptions): Promise<RateLimitResult | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .rpc("check_rate_limit", {
        p_key: key,
        p_limit: limit,
        p_window_ms: windowMs,
      });

    if (error) return null;

    const row = Array.isArray(data)
      ? (data[0] as SupabaseRateLimitRow | undefined)
      : (data as SupabaseRateLimitRow | null);

    if (!row) return null;

    return {
      ok: Boolean(row.ok),
      remaining: Number(row.remaining) || 0,
      retryAfter: Number(row.retry_after) || 0,
    };
  } catch {
    return null;
  }
}

function checkMemoryRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;
  return {
    ok: true,
    remaining: Math.max(0, limit - current.count),
    retryAfter: 0,
  };
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: "Demasiadas solicitudes. Inténtalo de nuevo en unos minutos." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    }
  );
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

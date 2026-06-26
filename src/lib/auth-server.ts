import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { getClientIp, checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function getUserFromAccessToken(token: string | null): Promise<User | null> {
  if (!token || !supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export function getAccessTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function requireAuth(request: Request): Promise<{ user: User; token: string } | Response> {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { user, token };
}

export async function enforceUserRateLimit(
  request: Request,
  userId: string,
  scope: string,
  limit = 20,
  windowMs = 60 * 60 * 1000
) {
  const ip = getClientIp(request);
  const result = await checkRateLimit({ key: `${scope}:${userId}:${ip}`, limit, windowMs });
  if (!result.ok) return rateLimitResponse(result.retryAfter);
  return null;
}

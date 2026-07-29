import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { getSupabaseForUser } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
  const limited = await enforceUserRateLimit(request, user.id, "instagram-disconnect", 10, 60 * 60 * 1000);
  if (limited) return limited;

  const { error } = await getSupabaseForUser(token)
    .from("instagram_connections")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

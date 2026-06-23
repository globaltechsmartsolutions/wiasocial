import { NextResponse } from "next/server";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { getSupabaseForUser } from "@/lib/supabase-admin";
import { syncInstagramDataForUser } from "@/lib/instagram-sync";

export async function POST(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const sb = getSupabaseForUser(token);
  const { data: connection, error } = await sb
    .from("instagram_connections")
    .select("ig_user_id, access_token, page_id")
    .eq("user_id", user.id)
    .single();

  if (error || !connection) {
    return NextResponse.json({ error: "Instagram no conectado" }, { status: 400 });
  }

  try {
    const result = await syncInstagramDataForUser(sb, user.id, {
      ig_user_id: connection.ig_user_id as string,
      access_token: connection.access_token as string,
      loginType: connection.page_id ? "facebook" : "instagram",
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

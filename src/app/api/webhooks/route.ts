import { NextResponse } from "next/server";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { getSupabaseForUser } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { event, payload } = body as { event: string; payload: Record<string, unknown> };

  const sb = getSupabaseForUser(token);
  const { data: settings } = await sb
    .from("user_settings")
    .select("webhook_url")
    .eq("user_id", user.id)
    .single();

  const webhookUrl = settings?.webhook_url as string | null;
  if (!webhookUrl) {
    return NextResponse.json({ sent: false, reason: "no_webhook_url" });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: event ?? "test",
        timestamp: new Date().toISOString(),
        source: "wia-instagram-growth-os",
        data: payload ?? {},
      }),
    });

    return NextResponse.json({ sent: true, status: res.status });
  } catch (err) {
    return NextResponse.json({ sent: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

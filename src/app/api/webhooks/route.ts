import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { getSupabaseForUser } from "@/lib/supabase-admin";
import { deliverWebhook, UnsafeWebhookUrlError } from "@/lib/webhook-delivery";
import { readJsonObject } from "@/lib/request-validation";

export async function POST(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceUserRateLimit(request, user.id, "webhook-test", 30, 60 * 60 * 1000);
  if (limited) return limited;

  const parsed = await readJsonObject<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const event = typeof body.event === "string" && body.event.length <= 100 ? body.event : "test";
  const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
    ? body.payload as Record<string, unknown>
    : {};

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
    const outgoingBody = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      source: "wia-instagram-growth-os",
      data: payload,
    });
    const result = await deliverWebhook(webhookUrl, outgoingBody, event);

    return NextResponse.json({ sent: true, status: result.status });
  } catch (err) {
    const status = err instanceof UnsafeWebhookUrlError ? 400 : 502;
    return NextResponse.json(
      { sent: false, error: err instanceof Error ? err.message : "No se ha podido entregar el webhook" },
      { status }
    );
  }
}

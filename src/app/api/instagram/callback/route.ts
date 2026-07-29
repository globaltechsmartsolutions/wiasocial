import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAppUrl } from "@/lib/app-url";
import { connectInstagramLoginAccount, verifyInstagramOAuthState } from "@/lib/instagram-login";
import { syncInstagramDataForUser } from "@/lib/instagram-sync";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.replace(/#_$/, "");
  const state = searchParams.get("state");
  const error = searchParams.get("error_description") || searchParams.get("error");

  if (error) {
    console.error("Instagram OAuth returned an error", { error });
    return finishInstagramOAuth(`${getAppUrl()}/settings?instagram=error`, false);
  }

  if (!code || !state) {
    console.error("Instagram OAuth callback missing code or state", { hasCode: Boolean(code), hasState: Boolean(state) });
    return finishInstagramOAuth(`${getAppUrl()}/settings?instagram=error`, false);
  }

  const userId = verifyInstagramOAuthState(state);
  if (!userId) {
    console.error("Instagram OAuth callback had invalid state");
    return finishInstagramOAuth(`${getAppUrl()}/settings?instagram=error`, false);
  }

  try {
    const sb = getSupabaseAdmin();
    const account = await connectInstagramLoginAccount(code);
    const expiresAt = new Date(Date.now() + account.expiresIn * 1000).toISOString();

    const { error: dbError } = await sb
      .from("instagram_connections")
      .upsert({
        user_id: userId,
        ig_user_id: account.igUserId,
        ig_username: account.igUsername,
        page_id: null,
        access_token: account.accessToken,
        token_expires_at: expiresAt,
        followers_count: account.followersCount,
        media_count: account.mediaCount,
        connected_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (dbError) throw dbError;

    await sb
      .from("user_settings")
      .upsert({
        user_id: userId,
        instagram_handle: `@${account.igUsername}`,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    let synced = false;
    try {
      await syncInstagramDataForUser(sb, userId, {
        ig_user_id: account.igUserId,
        access_token: account.accessToken,
        loginType: "instagram",
      });
      synced = true;
    } catch {
      synced = false;
    }

    const params = new URLSearchParams({
      instagram: "connected",
      user: account.igUsername,
      synced: synced ? "1" : "0",
    });
    return finishInstagramOAuth(`${getAppUrl()}/dashboard?${params}`, true);
  } catch (err) {
    const message = err instanceof Error ? err.message : "connection_failed";
    console.error("Instagram OAuth connection failed", { message });
    return finishInstagramOAuth(`${getAppUrl()}/dashboard?instagram=error`, false);
  }
}

function finishInstagramOAuth(redirectTo: string, success: boolean) {
  const type = success ? "wia:instagram-connected" : "wia:instagram-error";
  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Instagram conectado</title>
  </head>
  <body style="font-family: system-ui, sans-serif; display: grid; min-height: 100vh; place-items: center; background: #0a0a0a; color: #f5f5f5;">
    <p>${success ? "Instagram conectado. Volviendo a WIA..." : "No se pudo conectar Instagram. Volviendo a WIA..."}</p>
    <script>
      const payload = { type: ${JSON.stringify(type)}, redirectTo: ${JSON.stringify(redirectTo)} };
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(payload, window.location.origin);
        window.close();
      } else {
        window.location.replace(${JSON.stringify(redirectTo)});
      }
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

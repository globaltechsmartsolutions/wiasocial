import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAppUrl } from "@/lib/meta";
import { connectInstagramLoginAccount, verifyInstagramOAuthState } from "@/lib/instagram-login";
import { syncInstagramDataForUser } from "@/lib/instagram-sync";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.replace(/#_$/, "");
  const state = searchParams.get("state");
  const error = searchParams.get("error_description") || searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${getAppUrl()}/settings?instagram=error&message=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${getAppUrl()}/settings?instagram=error&message=missing_code`);
  }

  const userId = verifyInstagramOAuthState(state);
  if (!userId) {
    return NextResponse.redirect(`${getAppUrl()}/settings?instagram=error&message=invalid_state`);
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
    return NextResponse.redirect(`${getAppUrl()}/dashboard?${params}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "connection_failed";
    return NextResponse.redirect(`${getAppUrl()}/settings?instagram=error&message=${encodeURIComponent(message)}`);
  }
}

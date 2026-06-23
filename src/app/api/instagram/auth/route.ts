import { NextResponse } from "next/server";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import {
  buildInstagramLoginUrl,
  isInstagramLoginConfigured,
  signInstagramOAuthState,
} from "@/lib/instagram-login";

export async function GET(request: Request) {
  if (!isInstagramLoginConfigured()) {
    return NextResponse.json(
      { error: "Instagram App no configurada. Añade INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET en Railway." },
      { status: 503 }
    );
  }

  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const state = signInstagramOAuthState(user.id);
  return NextResponse.redirect(buildInstagramLoginUrl(state));
}

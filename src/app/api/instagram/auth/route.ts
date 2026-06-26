import { NextResponse } from "next/server";
import { enforceUserRateLimit, requireAuth } from "@/lib/auth-server";
import {
  buildInstagramLoginUrl,
  isInstagramLoginConfigured,
  signInstagramOAuthState,
} from "@/lib/instagram-login";

export async function POST(request: Request) {
  if (!isInstagramLoginConfigured()) {
    return NextResponse.json(
      { error: "Instagram App no configurada. Añade INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET en Railway." },
      { status: 503 }
    );
  }

  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const limited = await enforceUserRateLimit(request, auth.user.id, "instagram-auth", 10, 60 * 60 * 1000);
  if (limited) return limited;

  const state = signInstagramOAuthState(auth.user.id);
  return NextResponse.json({ url: buildInstagramLoginUrl(state) });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

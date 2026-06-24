import { NextResponse } from "next/server";
import { isInstagramLoginConfigured } from "@/lib/instagram-login";
import { isInstagramLoginConfiguredPublic } from "@/lib/instagram-config";

export async function GET() {
  const serverOk = isInstagramLoginConfigured();
  const clientOk = isInstagramLoginConfiguredPublic();

  return NextResponse.json({
    ready: serverOk && clientOk,
    serverConfigured: serverOk,
    publicConfigured: clientOk,
    message: serverOk && clientOk
      ? "Instagram listo para conectar"
      : !clientOk
        ? "Falta NEXT_PUBLIC_INSTAGRAM_APP_ID específico de Instagram Login en Railway"
        : "Faltan INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET específicos de Instagram Login en Railway",
  });
}

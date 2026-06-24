import { NextResponse } from "next/server";
import { isInstagramLoginConfigured } from "@/lib/instagram-login";
import { isOpenAIConfigured } from "@/lib/openai";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  const checks = {
    supabase: isSupabaseConfigured(),
    openai: isOpenAIConfigured(),
    instagram: isInstagramLoginConfigured(),
  };

  const healthy = checks.supabase && checks.openai;

  return NextResponse.json(
    {
      ok: healthy,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}

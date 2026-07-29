import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isConfiguredEnvValue, isConfiguredHttpUrl } from "@/lib/env";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return isConfiguredHttpUrl(supabaseUrl) && isConfiguredEnvValue(supabaseAnonKey);
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Add credentials to .env.local");
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }
  return client;
}

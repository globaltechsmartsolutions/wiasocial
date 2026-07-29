import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isConfiguredEnvValue, isConfiguredHttpUrl } from "@/lib/env";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function getSupabaseForUser(accessToken: string): SupabaseClient {
  if (!isConfiguredHttpUrl(supabaseUrl) || !isConfiguredEnvValue(supabaseAnonKey)) {
    throw new Error("Supabase no está configurado para operaciones de servidor");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!isConfiguredHttpUrl(supabaseUrl) || !isConfiguredEnvValue(serviceRoleKey)) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for server operations");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

import { NextResponse } from "next/server";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { getSupabaseForUser } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseForUser(token);
  const { data } = await sb
    .from("user_settings")
    .select("plan, stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    plan: data?.plan ?? "free",
    hasSubscription: !!(data?.stripe_subscription_id),
  });
}

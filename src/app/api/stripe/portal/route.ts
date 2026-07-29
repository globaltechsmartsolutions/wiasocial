import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getSupabaseForUser } from "@/lib/supabase-admin";
import { getAppUrl } from "@/lib/app-url";

export async function POST(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceUserRateLimit(request, user.id, "stripe-portal", 10, 60 * 60 * 1000);
  if (limited) return limited;
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe no configurado" }, { status: 503 });
  }

  const stripe = getStripe();

  const sb = getSupabaseForUser(token);
  const { data: settings } = await sb
    .from("user_settings")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings?.stripe_customer_id) {
    return NextResponse.json({ error: "No hay suscripción activa" }, { status: 404 });
  }

  const appUrl = getAppUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: settings.stripe_customer_id,
    return_url: `${appUrl}/settings`,
  });

  return NextResponse.json({ url: session.url });
}

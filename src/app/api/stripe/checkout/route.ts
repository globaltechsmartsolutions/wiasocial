import { NextResponse } from "next/server";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { stripe, PLANS, isStripeConfigured, type PlanKey } from "@/lib/stripe";
import { getSupabaseForUser } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe no configurado" }, { status: 503 });
  }

  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const planKey = (body.plan as PlanKey) ?? "starter";
  const plan = PLANS[planKey];
  if (!plan) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

  const sb = getSupabaseForUser(token);
  const { data: settings } = await sb
    .from("user_settings")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "subscription",
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?upgrade=success`,
    cancel_url: `${appUrl}/dashboard?upgrade=cancelled`,
    metadata: { user_id: user.id, plan: planKey },
    subscription_data: { metadata: { user_id: user.id, plan: planKey } },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  };

  if (settings?.stripe_customer_id) {
    sessionParams.customer = settings.stripe_customer_id;
  } else {
    sessionParams.customer_email = user.email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return NextResponse.json({ url: session.url });
}

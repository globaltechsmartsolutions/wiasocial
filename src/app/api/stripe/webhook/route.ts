import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured, planFromPriceId, type PlanKey } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type Stripe from "stripe";

export const runtime = "nodejs";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;
type EventOutcome = "processed" | "ignored";

/** The subscription entitles the customer to their paid plan. */
const ACTIVE_STATUSES = new Set(["active", "trialing"]);
/** Dunning window: Stripe may still collect, so the current plan is kept. */
const GRACE_STATUSES = new Set(["past_due", "incomplete"]);

interface BillingPatch {
  plan?: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  plan_expires_at?: string | null;
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function periodEndOf(sub: Stripe.Subscription): string | null {
  // The field moved to the subscription item in recent API versions; read both.
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const raw =
    item?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  return typeof raw === "number" ? new Date(raw * 1000).toISOString() : null;
}

function planFromMetadata(metadata: Stripe.Metadata | null | undefined): PlanKey | null {
  const value = metadata?.plan;
  return value === "starter" || value === "agency" ? value : null;
}

async function resolveUserId(sb: AdminClient, source: Stripe.Subscription | Stripe.Checkout.Session) {
  const fromMetadata = source.metadata?.user_id;
  if (fromMetadata) return fromMetadata;

  const customerId = idOf(source.customer);
  if (!customerId) return null;

  const { data } = await sb
    .from("user_settings")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return (data?.user_id as string | null) ?? null;
}

async function applyBillingState(
  sb: AdminClient,
  userId: string,
  patch: BillingPatch,
  eventCreatedAt: Date
) {
  const { data: current, error: readError } = await sb
    .from("user_settings")
    .select("stripe_event_created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) throw new Error(`No se pudo leer el estado actual: ${readError.message}`);

  const applied = current?.stripe_event_created_at as string | null | undefined;
  if (applied && new Date(applied) > eventCreatedAt) {
    // A newer event already landed. Applying this one would move the state backwards.
    return;
  }

  const { error: writeError } = await sb.from("user_settings").upsert(
    {
      user_id: userId,
      ...patch,
      stripe_event_created_at: eventCreatedAt.toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (writeError) throw new Error(`No se pudo guardar el estado de facturación: ${writeError.message}`);
}

async function handleSubscription(
  sb: AdminClient,
  sub: Stripe.Subscription,
  eventCreatedAt: Date
): Promise<EventOutcome> {
  const userId = await resolveUserId(sb, sub);
  if (!userId) {
    console.error("[stripe] suscripción sin usuario resoluble:", sub.id);
    return "ignored";
  }

  const customerId = idOf(sub.customer);
  const periodEnd = periodEndOf(sub);

  if (GRACE_STATUSES.has(sub.status)) {
    await applyBillingState(
      sb,
      userId,
      { stripe_customer_id: customerId, stripe_subscription_id: sub.id, plan_expires_at: periodEnd },
      eventCreatedAt
    );
    return "processed";
  }

  if (!ACTIVE_STATUSES.has(sub.status)) {
    await applyBillingState(
      sb,
      userId,
      {
        plan: "free",
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        plan_expires_at: null,
      },
      eventCreatedAt
    );
    return "processed";
  }

  const priceId = idOf(sub.items?.data?.[0]?.price as { id: string } | undefined);
  const plan = planFromPriceId(priceId) ?? planFromMetadata(sub.metadata);

  if (!plan) {
    // Not transient: the Price ID is not one of ours, or STRIPE_PRICE_* is
    // misconfigured. Fail loudly rather than guessing an entitlement.
    throw new Error(`Price ID sin plan asociado (${priceId ?? "desconocido"}) en ${sub.id}`);
  }

  await applyBillingState(
    sb,
    userId,
    {
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan_expires_at: periodEnd,
    },
    eventCreatedAt
  );

  return "processed";
}

async function handleEvent(sb: AdminClient, event: Stripe.Event): Promise<EventOutcome> {
  const eventCreatedAt = new Date(event.created * 1000);

  switch (event.type) {
    case "checkout.session.completed": {
      // Only the Stripe identifiers are stored here. The plan comes from the
      // subscription events, which carry the Price ID that was actually billed.
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = await resolveUserId(sb, session);
      if (!userId) {
        console.error("[stripe] checkout sin usuario resoluble:", session.id);
        return "ignored";
      }

      await applyBillingState(
        sb,
        userId,
        {
          stripe_customer_id: idOf(session.customer),
          stripe_subscription_id: idOf(session.subscription),
        },
        eventCreatedAt
      );
      return "processed";
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
      return handleSubscription(sb, event.data.object as Stripe.Subscription, eventCreatedAt);

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await resolveUserId(sb, sub);
      if (!userId) {
        console.error("[stripe] cancelación sin usuario resoluble:", sub.id);
        return "ignored";
      }

      await applyBillingState(
        sb,
        userId,
        { plan: "free", stripe_subscription_id: null, plan_expires_at: null },
        eventCreatedAt
      );
      return "processed";
    }

    default:
      return "ignored";
  }
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe no configurado" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  // Claim the event before doing any work. A redelivery of something already
  // processed is acknowledged without reapplying the mutation.
  const { error: claimError } = await sb.from("stripe_events").insert({
    event_id: event.id,
    type: event.type,
    event_created_at: new Date(event.created * 1000).toISOString(),
  });

  if (claimError) {
    if (claimError.code !== "23505") {
      console.error("[stripe] registro de eventos no disponible:", claimError.message);
      return NextResponse.json({ error: "event_log_unavailable" }, { status: 500 });
    }

    const { data: existing } = await sb
      .from("stripe_events")
      .select("status, attempts")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existing && existing.status !== "failed") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Previous attempt failed and Stripe is retrying: process it again.
    await sb
      .from("stripe_events")
      .update({
        status: "received",
        attempts: ((existing?.attempts as number | null) ?? 1) + 1,
        last_error: null,
      })
      .eq("event_id", event.id);
  }

  try {
    const outcome = await handleEvent(sb, event);

    await sb
      .from("stripe_events")
      .update({ status: outcome, processed_at: new Date().toISOString(), last_error: null })
      .eq("event_id", event.id);

    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("[stripe] fallo procesando", event.type, event.id, message);

    await sb
      .from("stripe_events")
      .update({ status: "failed", last_error: message })
      .eq("event_id", event.id);

    // 5xx so Stripe retries with backoff instead of considering it delivered.
    return NextResponse.json({ error: "event_processing_failed" }, { status: 500 });
  }
}

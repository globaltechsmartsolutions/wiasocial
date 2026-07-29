import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!apiKey) {
    throw new Error("Stripe no está configurado");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(apiKey, {
      apiVersion: "2026-06-24.dahlia",
    });
  }

  return stripeClient;
}

export const PLANS = {
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_STARTER!,
    price: 29,
    currency: "eur",
    features: [
      "Generaciones IA ilimitadas",
      "Radar de crecimiento semanal",
      "Detector de tendencias",
      "Informes mensuales automáticos",
      "Soporte prioritario",
    ],
  },
  agency: {
    name: "Agency",
    priceId: process.env.STRIPE_PRICE_AGENCY!,
    price: 79,
    currency: "eur",
    features: [
      "Todo lo de Starter",
      "CRM multi-cliente ilimitado",
      "Webhooks personalizados",
      "Acceso anticipado a nuevas funciones",
      "Soporte dedicado",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/**
 * Maps a Stripe Price ID back to a plan. This is the only trustworthy source:
 * checkout metadata is written by our own code and proves nothing about what
 * the customer was actually billed for.
 */
export function planFromPriceId(priceId: string | null | undefined): PlanKey | null {
  if (!priceId?.trim()) return null;

  for (const key of Object.keys(PLANS) as PlanKey[]) {
    const configured = PLANS[key].priceId?.trim();
    if (configured && configured === priceId) return key;
  }

  return null;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function isStripePlanConfigured(plan: PlanKey) {
  return isStripeConfigured() && Boolean(PLANS[plan].priceId?.trim());
}

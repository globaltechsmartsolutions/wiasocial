import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-06-24.dahlia",
});

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

export function isStripeConfigured() {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_STARTER);
}

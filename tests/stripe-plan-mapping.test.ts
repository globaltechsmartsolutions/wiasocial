import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadStripeLib(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return import("../src/lib/stripe");
}

const CONFIGURED = {
  STRIPE_PRICE_STARTER: "price_starter_test",
  STRIPE_PRICE_AGENCY: "price_agency_test",
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  delete process.env.STRIPE_PRICE_STARTER;
  delete process.env.STRIPE_PRICE_AGENCY;
});

describe("planFromPriceId", () => {
  it("resuelve el plan a partir del Price ID facturado", async () => {
    const { planFromPriceId } = await loadStripeLib(CONFIGURED);

    expect(planFromPriceId("price_starter_test")).toBe("starter");
    expect(planFromPriceId("price_agency_test")).toBe("agency");
  });

  it("no resuelve un Price ID desconocido", async () => {
    const { planFromPriceId } = await loadStripeLib(CONFIGURED);

    expect(planFromPriceId("price_de_otra_cuenta")).toBeNull();
    expect(planFromPriceId("")).toBeNull();
    expect(planFromPriceId(null)).toBeNull();
    expect(planFromPriceId(undefined)).toBeNull();
  });

  it("no concede plan cuando los Price ID no están configurados", async () => {
    // Sin esta guarda, un precio vacío coincidiría con una variable vacía y
    // cualquier suscripción daría plan de pago.
    const { planFromPriceId } = await loadStripeLib({
      STRIPE_PRICE_STARTER: undefined,
      STRIPE_PRICE_AGENCY: "",
    });

    expect(planFromPriceId("")).toBeNull();
    expect(planFromPriceId("price_cualquiera")).toBeNull();
  });
});

describe("isStripePlanConfigured", () => {
  it("exige clave secreta y Price ID del plan concreto", async () => {
    const { isStripePlanConfigured } = await loadStripeLib({
      ...CONFIGURED,
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_PRICE_AGENCY: "",
    });

    expect(isStripePlanConfigured("starter")).toBe(true);
    expect(isStripePlanConfigured("agency")).toBe(false);
  });
});

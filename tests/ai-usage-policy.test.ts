import { afterEach, describe, expect, it } from "vitest";

import { currentMonthKey, getPlanUsagePolicy } from "../src/lib/ai-usage";

const OVERRIDE_KEYS = ["AI_LIMIT_FREE", "AI_LIMIT_STARTER", "AI_LIMIT_AGENCY"] as const;

afterEach(() => {
  for (const key of OVERRIDE_KEYS) delete process.env[key];
});

describe("getPlanUsagePolicy", () => {
  it("limita el plan gratuito y no lo presenta como ilimitado", () => {
    expect(getPlanUsagePolicy("free")).toEqual({ limit: 5, displayUnlimited: false });
  });

  it("da a los planes de pago un techo finito aunque se anuncien como ilimitados", () => {
    const starter = getPlanUsagePolicy("starter");
    const agency = getPlanUsagePolicy("agency");

    expect(Number.isFinite(starter.limit)).toBe(true);
    expect(Number.isFinite(agency.limit)).toBe(true);
    expect(starter.displayUnlimited).toBe(true);
    expect(agency.displayUnlimited).toBe(true);
    expect(agency.limit).toBeGreaterThan(starter.limit);
  });

  it("trata un plan desconocido como gratuito", () => {
    expect(getPlanUsagePolicy("enterprise")).toEqual(getPlanUsagePolicy("free"));
    expect(getPlanUsagePolicy("")).toEqual(getPlanUsagePolicy("free"));
  });

  it("acepta un techo configurado por entorno", () => {
    process.env.AI_LIMIT_STARTER = "42";
    expect(getPlanUsagePolicy("starter")).toEqual({ limit: 42, displayUnlimited: true });
  });

  it.each(["abc", "0", "-10", "  ", "12.5"])(
    "ignora un techo de entorno inválido: %s",
    (value) => {
      process.env.AI_LIMIT_AGENCY = value;
      expect(getPlanUsagePolicy("agency").limit).toBe(2000);
    }
  );
});

describe("currentMonthKey", () => {
  it("usa el formato que valida increment_ai_usage", () => {
    expect(currentMonthKey(new Date("2026-01-15T12:00:00Z"))).toBe("2026-01");
    expect(currentMonthKey(new Date("2026-12-31T23:00:00Z"))).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    expect(currentMonthKey()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });
});

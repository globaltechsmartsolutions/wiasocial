import { describe, expect, it } from "vitest";
import { routeContentTemplate } from "../src/lib/content-template-router";

describe("routeContentTemplate", () => {
  it("respeta una plantilla elegida manualmente", () => {
    const route = routeContentTemplate({
      topic: "Cómo conseguir reservas",
      preferredTemplateId: "comparison",
    });

    expect(route.templateId).toBe("comparison");
    expect(route.reasoning).toContain("manualmente");
  });

  it("prioriza evidencia real como caso de estudio", () => {
    const route = routeContentTemplate({
      topic: "Así mejoramos las reservas",
      proof: "De 20 a 48 reservas semanales",
    });

    expect(route.templateId).toBe("case_study");
  });

  it("elige venta directa para una intención de conversión", () => {
    const route = routeContentTemplate({
      topic: "Experiencia japonesa premium",
      funnelStage: "conversion",
      commercialIntensity: "direct",
    });

    expect(route.templateId).toBe("direct_offer");
  });
});

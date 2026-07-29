import { describe, expect, it } from "vitest";
import {
  countBrandMemoryFields,
  defaultBrandMemory,
  normalizeBrandMemory,
} from "../src/lib/brand-memory";

describe("brand memory", () => {
  it("normaliza datos desconocidos sin filtrar valores no textuales", () => {
    const memory = normalizeBrandMemory({
      brandPromise: "Reservas sin fricción",
      differentiator: 42,
      proofPoints: ["premio"],
    });

    expect(memory.brandPromise).toBe("Reservas sin fricción");
    expect(memory.differentiator).toBe("");
    expect(memory.proofPoints).toBe("");
  });

  it("cuenta únicamente campos con contenido", () => {
    const result = countBrandMemoryFields({
      ...defaultBrandMemory,
      brandPromise: "Servicio premium",
      differentiator: "   ",
      proofPoints: "4,9 de valoración",
    });

    expect(result).toEqual({ completed: 2, total: 11 });
  });
});

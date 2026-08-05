import { afterEach, describe, expect, it } from "vitest";
import { AI_TASK_REGISTRY, getTaskSpec, type AITaskId } from "@/lib/ai/task-registry";
import { estimateCostUsd, getModelCapabilities, resolveModel } from "@/lib/ai/model-aliases";
import {
  CONTENT_STUDIO_PROVIDER_SCHEMA,
  contentStudioInputSchema,
  contentStudioOutputSchema,
} from "@/lib/ai/schemas/content-studio";

describe("AITaskRegistry", () => {
  const specs = Object.values(AI_TASK_REGISTRY);

  it("define límites explícitos y sanos para todas las tareas", () => {
    expect(specs.length).toBeGreaterThanOrEqual(23);
    for (const spec of specs) {
      expect(spec.id.length).toBeGreaterThan(0);
      expect(spec.promptVersion).toBeGreaterThanOrEqual(1);
      expect(spec.maxOutputTokens).toBeGreaterThan(0);
      expect(spec.maxOutputTokens).toBeLessThanOrEqual(16_000);
      expect(spec.timeoutMs).toBeGreaterThanOrEqual(5_000);
      expect(spec.timeoutMs).toBeLessThanOrEqual(120_000);
      expect(spec.maxAttempts).toBeGreaterThanOrEqual(1);
      expect(spec.maxAttempts).toBeLessThanOrEqual(3);
      expect(spec.maxInputChars).toBeGreaterThan(0);
      expect(spec.temperature).toBeGreaterThanOrEqual(0);
      expect(spec.temperature).toBeLessThanOrEqual(1.2);
      expect(spec.quotaUnits).toBeGreaterThanOrEqual(1);
      expect(spec.contextPolicy.length).toBeGreaterThan(0);
    }
  });

  it("cada spec está registrada bajo su propio id", () => {
    for (const [key, spec] of Object.entries(AI_TASK_REGISTRY)) {
      expect(spec.id).toBe(key);
    }
  });

  it("getTaskSpec devuelve la tarea registrada", () => {
    expect(getTaskSpec("content").modelAlias).toBe("TEXT_PREMIUM_PRIMARY");
    expect(() => getTaskSpec("no-existe" as AITaskId)).toThrow(/no registrada/);
  });

  it("la tarea content tiene esquemas de entrada y salida", () => {
    const spec = getTaskSpec("content");
    expect(spec.inputSchema).toBeDefined();
    expect(spec.outputSchema).toBeDefined();
    expect(spec.contextPolicy).not.toContain("legacy-full");
  });
});

describe("esquemas de Content Studio", () => {
  it("acepta un brief válido y aplica defaults", () => {
    const parsed = contentStudioInputSchema.parse({
      niche: "clínica dental",
      audience: "familias con niños",
      offer: "primera revisión gratuita",
    });
    expect(parsed.goal).toBe("leads");
    expect(parsed.locale).toBe("es");
  });

  it("rechaza briefs vacíos o desproporcionados", () => {
    expect(
      contentStudioInputSchema.safeParse({ niche: "", audience: "a", offer: "b" }).success
    ).toBe(false);
    expect(
      contentStudioInputSchema.safeParse({
        niche: "x".repeat(500),
        audience: "familias",
        offer: "oferta",
      }).success
    ).toBe(false);
  });

  it("el esquema del proveedor y el esquema Zod cubren las mismas claves", () => {
    const providerKeys = Object.keys(
      (CONTENT_STUDIO_PROVIDER_SCHEMA as { properties: Record<string, unknown> }).properties
    ).sort();
    const zodKeys = Object.keys(contentStudioOutputSchema.shape).sort();
    expect(providerKeys).toEqual(zodKeys);
  });

  it("el esquema del proveedor es estricto en todos los objetos", () => {
    const visit = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const record = node as Record<string, unknown>;
      if (record.type === "object") {
        expect(record.additionalProperties).toBe(false);
        const properties = record.properties as Record<string, unknown>;
        expect((record.required as string[]).sort()).toEqual(Object.keys(properties).sort());
        for (const child of Object.values(properties)) visit(child);
      }
      if (record.type === "array") visit(record.items);
    };
    visit(CONTENT_STUDIO_PROVIDER_SCHEMA);
  });

  it("la validación de negocio rechaza score fuera de rango aunque la forma sea válida", () => {
    const base = buildValidOutput();
    expect(contentStudioOutputSchema.safeParse(base).success).toBe(true);
    const invalid = { ...base, qualityReview: { ...base.qualityReview, score: 150 } };
    expect(contentStudioOutputSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("alias de modelos", () => {
  const savedEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("resuelve el modelo homologado por defecto", () => {
    delete process.env.AI_MODEL_TEXT_PREMIUM;
    delete process.env.CONTENT_STUDIO_OPENAI_MODEL;
    delete process.env.CONTENT_STUDIO_PREMIUM_MODEL;
    expect(resolveModel("TEXT_PREMIUM_PRIMARY")).toBe("gpt-4o-mini");
    expect(resolveModel("TEXT_STANDARD_PRIMARY")).toBe("gpt-4o-mini");
  });

  it("respeta overrides por entorno, incluidos los nombres antiguos", () => {
    process.env.AI_MODEL_TEXT_PREMIUM = "gpt-4.1";
    expect(resolveModel("TEXT_PREMIUM_PRIMARY")).toBe("gpt-4.1");
    delete process.env.AI_MODEL_TEXT_PREMIUM;
    process.env.CONTENT_STUDIO_OPENAI_MODEL = "gpt-4o";
    expect(resolveModel("TEXT_PREMIUM_PRIMARY")).toBe("gpt-4o");
  });

  it("describe las capacidades por familia de modelo", () => {
    for (const model of ["gpt-4o-mini", "gpt-4.1", "GPT-4O"]) {
      expect(getModelCapabilities(model), model).toEqual({
        maxOutputTokensParam: "max_tokens",
        supportsTemperature: true,
      });
    }
    for (const model of ["o1", "o3-mini", "o4-mini", "gpt-5.6-terra", " GPT-5 "]) {
      expect(getModelCapabilities(model), model).toEqual({
        maxOutputTokensParam: "max_completion_tokens",
        supportsTemperature: false,
      });
    }
  });

  it("estima coste solo para modelos con precio conocido", () => {
    expect(estimateCostUsd("gpt-4o-mini", 1_000_000, 1_000_000)).toBeCloseTo(0.75);
    expect(estimateCostUsd("modelo-desconocido", 1000, 1000)).toBeNull();
    expect(estimateCostUsd("gpt-4o-mini", null, 10)).toBeNull();
  });
});

export function buildValidOutput() {
  return {
    contentRoute: {
      templateId: "educational" as const,
      templateName: "Educativo",
      topicSummary: "Concepto corto",
      intent: "Explicar",
      reasoning: "El tema necesita pedagogía",
      slidePattern: ["cover", "context", "cta"],
      visualStyle: "Claro",
    },
    strategy: {
      angle: "Ángulo",
      promise: "Promesa",
      audiencePain: "Dolor",
      conversionIntent: "Intención",
      recommendedFormat: "carousel" as const,
      whyThisWillWork: "Porque sí",
    },
    primaryPiece: {
      title: "Título",
      hook: "Hook",
      caption: "Caption",
      cta: "CTA",
      reelScript: "",
      publishingNotes: "",
    },
    variants: [{ label: "Directa", angle: "a", hook: "h", caption: "c", cta: "cta" }],
    carousel: [
      { slide: 1, type: "cover", headline: "Uno", support: "s", visualCue: "v" },
      { slide: 2, type: "context", headline: "Dos", support: "s", visualCue: "v" },
      { slide: 3, type: "cta", headline: "Tres", support: "s", visualCue: "v" },
    ],
    stories: [{ slide: 1, type: "hook" as const, text: "t", sticker: "s", cta: "c" }],
    dmFollowUp: "dm",
    visualDirection: {
      template: "t",
      mood: "m",
      palette: ["#fff"],
      coverIdea: "c",
      assetPrompts: ["p"],
    },
    qualityReview: { score: 80, strengths: [], risks: [], improvements: [] },
    hook: "Hook",
    reelScript: "",
    caption: "Caption",
    cta: "CTA",
    hashtags: ["#uno"],
    storySequence: ["s1"],
    dmReplyTemplate: "dm",
  };
}

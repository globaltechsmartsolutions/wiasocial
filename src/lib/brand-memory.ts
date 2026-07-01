import type { BrandMemory } from "@/types";

export const defaultBrandMemory: BrandMemory = {
  brandPromise: "",
  differentiator: "",
  customerPain: "",
  customerDesire: "",
  contentPillars: "",
  proofPoints: "",
  objections: "",
  forbiddenClaims: "",
  visualStyle: "",
  brandVoiceNotes: "",
  referenceExamples: "",
};

export function normalizeBrandMemory(value: unknown): BrandMemory {
  const row = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    brandPromise: asString(row.brandPromise),
    differentiator: asString(row.differentiator),
    customerPain: asString(row.customerPain),
    customerDesire: asString(row.customerDesire),
    contentPillars: asString(row.contentPillars),
    proofPoints: asString(row.proofPoints),
    objections: asString(row.objections),
    forbiddenClaims: asString(row.forbiddenClaims),
    visualStyle: asString(row.visualStyle),
    brandVoiceNotes: asString(row.brandVoiceNotes),
    referenceExamples: asString(row.referenceExamples),
  };
}

export function mergeBrandMemory(value: unknown): BrandMemory {
  return { ...defaultBrandMemory, ...normalizeBrandMemory(value) };
}

export function countBrandMemoryFields(memory: BrandMemory): { completed: number; total: number } {
  const values = Object.values(memory);
  return {
    completed: values.filter((item) => item.trim().length > 0).length,
    total: values.length,
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

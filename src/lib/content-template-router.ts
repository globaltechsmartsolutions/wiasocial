import type {
  CarouselTemplateId,
  CommercialIntensity,
  ContentFunnelStage,
  ContentGoal,
  PremiumContentRoute,
} from "@/types";

export type ContentTemplateRouterInput = {
  topic?: string;
  niche?: string;
  audience?: string;
  offer?: string;
  goal?: ContentGoal | string;
  funnelStage?: ContentFunnelStage | string;
  commercialIntensity?: CommercialIntensity | string;
  preferredTemplateId?: CarouselTemplateId | string;
  objection?: string;
  proof?: string;
  desiredAction?: string;
};

type TemplateSignals = {
  myth?: boolean;
  mistake?: boolean;
  checklist?: boolean;
  objection?: boolean;
  caseStudy?: boolean;
  directOffer?: boolean;
  educational?: boolean;
  comparison?: boolean;
  beforeAfter?: boolean;
};

export type CarouselTemplateDefinition = {
  id: CarouselTemplateId;
  name: string;
  intent: string;
  whenToUse: string;
  slidePattern: string[];
  visualStyle: string;
  colors: {
    primary: string;
    secondary: string;
    mutedPrimary: string;
    mutedSecondary: string;
  };
};

export const CAROUSEL_TEMPLATE_DEFINITIONS: CarouselTemplateDefinition[] = [
  {
    id: "myth_busting",
    name: "Mito vs realidad",
    intent: "Cambiar una creencia limitante",
    whenToUse: "Cuando el topic contiene una idea falsa, una creencia popular o una objeción cultural que impide avanzar.",
    slidePattern: ["cover", "myth", "reality", "why-it-matters", "proof", "cta"],
    visualStyle: "Contraste alto, tensión entre dos columnas y cierre contundente.",
    colors: { primary: "#fb7185", secondary: "#38bdf8", mutedPrimary: "#4c0519", mutedSecondary: "#0f3d52" },
  },
  {
    id: "mistake_fix",
    name: "Error común",
    intent: "Hacer visible un fallo y enseñar la corrección",
    whenToUse: "Cuando el topic habla de errores, malas prácticas, pérdidas, bloqueos o decisiones que cuestan dinero/tiempo.",
    slidePattern: ["cover", "mistake", "cost", "why-it-happens", "fix", "cta"],
    visualStyle: "Visual de diagnóstico, señales de alerta y solución clara.",
    colors: { primary: "#f97316", secondary: "#a3e635", mutedPrimary: "#431407", mutedSecondary: "#365314" },
  },
  {
    id: "checklist",
    name: "Checklist accionable",
    intent: "Dar claridad práctica y pasos concretos",
    whenToUse: "Cuando el usuario pide pasos, guía, método, checklist, proceso o cómo hacer algo.",
    slidePattern: ["cover", "step-1", "step-2", "step-3", "final-check", "cta"],
    visualStyle: "Ordenado, modular, con marcas visuales de progreso.",
    colors: { primary: "#a3e635", secondary: "#22c55e", mutedPrimary: "#365314", mutedSecondary: "#052e16" },
  },
  {
    id: "objection_handler",
    name: "Objeción",
    intent: "Reducir fricción antes de la conversión",
    whenToUse: "Cuando hay miedo, duda, precio, falta de tiempo, desconfianza o una barrera concreta de compra.",
    slidePattern: ["cover", "objection", "reframe", "proof", "safe-next-step", "cta"],
    visualStyle: "Sereno, profesional, con sensación de seguridad y prueba.",
    colors: { primary: "#38bdf8", secondary: "#c084fc", mutedPrimary: "#0f3d52", mutedSecondary: "#3b0764" },
  },
  {
    id: "case_study",
    name: "Caso o prueba",
    intent: "Construir confianza desde evidencia",
    whenToUse: "Cuando hay prueba, caso, resultado, experiencia, antes/después, datos o autoridad demostrable.",
    slidePattern: ["cover", "before", "turning-point", "process", "result", "lesson", "cta"],
    visualStyle: "Editorial, basado en evidencia, con bloques de resultado y proceso.",
    colors: { primary: "#facc15", secondary: "#38bdf8", mutedPrimary: "#422006", mutedSecondary: "#0f3d52" },
  },
  {
    id: "direct_offer",
    name: "Venta directa",
    intent: "Convertir una necesidad clara en acción comercial",
    whenToUse: "Cuando el objetivo es venta/leads, el funnel está en conversión o la intensidad comercial es directa.",
    slidePattern: ["cover", "pain", "offer", "proof", "why-now", "cta"],
    visualStyle: "Comercial premium, beneficio claro, CTA visible y sin humo.",
    colors: { primary: "#a3e635", secondary: "#facc15", mutedPrimary: "#365314", mutedSecondary: "#422006" },
  },
  {
    id: "educational",
    name: "Educativo",
    intent: "Explicar una idea y ganar autoridad",
    whenToUse: "Cuando el topic necesita pedagogía, contexto, explicación o formación antes de vender.",
    slidePattern: ["cover", "context", "key-idea", "example", "application", "cta"],
    visualStyle: "Claro, didáctico, con jerarquía fuerte y ejemplos.",
    colors: { primary: "#38bdf8", secondary: "#a3e635", mutedPrimary: "#0f3d52", mutedSecondary: "#365314" },
  },
  {
    id: "comparison",
    name: "Comparación",
    intent: "Ayudar a elegir entre dos enfoques",
    whenToUse: "Cuando el topic compara opciones, métodos, precios, enfoques, antes/después conceptual o alternativas.",
    slidePattern: ["cover", "option-a", "option-b", "real-difference", "decision-rule", "cta"],
    visualStyle: "Doble columna, contraste limpio y regla de decisión.",
    colors: { primary: "#c084fc", secondary: "#38bdf8", mutedPrimary: "#3b0764", mutedSecondary: "#0f3d52" },
  },
  {
    id: "before_after",
    name: "Antes/después",
    intent: "Mostrar transformación",
    whenToUse: "Cuando el topic habla de cambio, transformación, evolución, mejora o estado actual frente a estado deseado.",
    slidePattern: ["cover", "before", "hidden-cost", "shift", "after", "cta"],
    visualStyle: "Narrativa de transformación con contraste de estados.",
    colors: { primary: "#2dd4bf", secondary: "#a3e635", mutedPrimary: "#134e4a", mutedSecondary: "#365314" },
  },
];

const DEFAULT_TEMPLATE_ID: CarouselTemplateId = "educational";

export function routeContentTemplate(input: ContentTemplateRouterInput): PremiumContentRoute {
  const text = normalizeSearchText([
    input.topic,
    input.niche,
    input.audience,
    input.offer,
    input.objection,
    input.proof,
    input.desiredAction,
    input.goal,
    input.funnelStage,
    input.commercialIntensity,
  ].filter(Boolean).join(" "));
  const signals = detectTemplateSignals(text, input);
  const forcedTemplateId = normalizeTemplateId(input.preferredTemplateId);
  const templateId = forcedTemplateId || chooseTemplateId(signals, input);
  const definition = getCarouselTemplateDefinition(templateId);
  const topicSummary = summarizeTopic(input.topic || input.offer || input.niche || "contenido de Instagram");

  return {
    templateId,
    templateName: definition.name,
    topicSummary,
    intent: definition.intent,
    reasoning: forcedTemplateId
      ? `Plantilla elegida manualmente por el usuario. ${definition.intent}.`
      : buildRoutingReason(definition, signals, input),
    slidePattern: definition.slidePattern,
    visualStyle: definition.visualStyle,
  };
}

export function normalizeContentRoute(value: unknown, fallbackInput: ContentTemplateRouterInput): PremiumContentRoute {
  const fallback = routeContentTemplate(fallbackInput);
  const row = asRecord(value);
  const templateId = normalizeTemplateId(row.templateId) || fallback.templateId;
  const definition = getCarouselTemplateDefinition(templateId);
  const slidePattern = asStringArray(row.slidePattern, definition.slidePattern);

  return {
    templateId,
    templateName: asString(row.templateName) || definition.name,
    topicSummary: asString(row.topicSummary) || fallback.topicSummary,
    intent: asString(row.intent) || definition.intent,
    reasoning: asString(row.reasoning) || fallback.reasoning,
    slidePattern,
    visualStyle: asString(row.visualStyle) || definition.visualStyle,
  };
}

export function getCarouselTemplateDefinition(templateId: CarouselTemplateId | string | undefined): CarouselTemplateDefinition {
  return CAROUSEL_TEMPLATE_DEFINITIONS.find((template) => template.id === templateId)
    ?? CAROUSEL_TEMPLATE_DEFINITIONS.find((template) => template.id === DEFAULT_TEMPLATE_ID)!;
}

export function getTemplateRenderColors(templateId: CarouselTemplateId | string | undefined, index: number) {
  const definition = getCarouselTemplateDefinition(templateId);
  const isPrimary = index % 2 === 0;
  return {
    accent: isPrimary ? definition.colors.primary : definition.colors.secondary,
    mutedAccent: isPrimary ? definition.colors.mutedPrimary : definition.colors.mutedSecondary,
  };
}

export function buildTemplateRouterPromptContext(route: PremiumContentRoute) {
  const templateList = CAROUSEL_TEMPLATE_DEFINITIONS
    .map((template) => [
      `- ${template.id}: ${template.name}`,
      `  Intent: ${template.intent}`,
      `  Use when: ${template.whenToUse}`,
      `  Slide pattern: ${template.slidePattern.join(" -> ")}`,
    ].join("\n"))
    .join("\n");

  return `Template router recommendation:
templateId: ${route.templateId}
templateName: ${route.templateName}
topicSummary: ${route.topicSummary}
intent: ${route.intent}
reasoning: ${route.reasoning}
slidePattern: ${route.slidePattern.join(" -> ")}
visualStyle: ${route.visualStyle}

Available carousel templates:
${templateList}`;
}

function chooseTemplateId(signals: TemplateSignals, input: ContentTemplateRouterInput): CarouselTemplateId {
  if (signals.caseStudy) return "case_study";
  if (signals.objection) return "objection_handler";
  if (signals.myth) return "myth_busting";
  if (signals.mistake) return "mistake_fix";
  if (signals.checklist) return "checklist";
  if (signals.comparison) return "comparison";
  if (signals.beforeAfter) return "before_after";
  if (signals.directOffer || input.goal === "sales" || input.funnelStage === "conversion" || input.commercialIntensity === "direct") {
    return "direct_offer";
  }
  if (signals.educational) return "educational";
  return DEFAULT_TEMPLATE_ID;
}

function detectTemplateSignals(text: string, input: ContentTemplateRouterInput): TemplateSignals {
  return {
    myth: hasAny(text, ["mito", "realidad", "mentira", "falso", "falsa", "creen", "nadie te dice", "malentendido"]),
    mistake: hasAny(text, ["error", "errores", "fallo", "fallos", "evita", "mala practica", "no funciona", "por que falla"]),
    checklist: hasAny(text, ["checklist", "lista", "pasos", "guia", "guía", "metodo", "método", "proceso", "como", "cómo", "framework"]),
    objection: Boolean(input.objection) || hasAny(text, ["miedo", "duda", "objecion", "objeción", "caro", "precio", "no tengo tiempo", "desconfianza", "riesgo"]),
    caseStudy: Boolean(input.proof) || hasAny(text, ["caso", "resultado", "prueba", "datos", "experiencia", "antes y despues", "antes y después", "testimonio"]),
    directOffer: hasAny(text, ["vender", "venta", "reservar", "reserva", "captar", "leads", "clientes", "pacientes", "diagnostico", "diagnóstico", "programa", "oferta"]),
    educational: hasAny(text, ["explicar", "entender", "aprende", "educar", "formar", "introduccion", "introducción", "principios"]),
    comparison: hasAny(text, [" vs ", "versus", "comparar", "comparacion", "comparación", "diferencia", "mejor que", "alternativa"]),
    beforeAfter: hasAny(text, ["antes", "despues", "después", "transformacion", "transformación", "cambio", "mejora", "evolucion", "evolución"]),
  };
}

function buildRoutingReason(
  definition: CarouselTemplateDefinition,
  signals: TemplateSignals,
  input: ContentTemplateRouterInput
) {
  if (definition.id === "case_study" && (input.proof || signals.caseStudy)) return "Hay prueba, caso o credibilidad suficiente para construir confianza.";
  if (definition.id === "objection_handler" && (input.objection || signals.objection)) return "Existe una barrera clara que conviene resolver antes de pedir acción.";
  if (definition.id === "direct_offer") return "La intención parece comercial y necesita llevar a una acción concreta.";
  if (definition.id === "checklist") return "El topic pide pasos claros y utilidad práctica.";
  if (definition.id === "myth_busting") return "El topic puede ganar fuerza rompiendo una creencia previa.";
  if (definition.id === "mistake_fix") return "El topic funciona mejor mostrando el error y su corrección.";
  if (definition.id === "comparison") return "La comparación ayuda a que la audiencia tome una decisión.";
  if (definition.id === "before_after") return "La narrativa de transformación hace visible el valor.";
  return "El topic necesita claridad, autoridad y explicación antes de convertir.";
}

function summarizeTopic(topic: string) {
  const clean = topic.replace(/\s+/g, " ").trim();
  if (!clean) return "Pieza de Instagram";
  if (clean.length <= 74) return clean;
  return `${clean.slice(0, 71).trim()}...`;
}

function normalizeTemplateId(value: unknown): CarouselTemplateId | null {
  if (typeof value !== "string") return null;
  return CAROUSEL_TEMPLATE_DEFINITIONS.some((template) => template.id === value) ? value as CarouselTemplateId : null;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalizeSearchText(term)));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(value)) {
    const items = value.map((item) => asString(item)).filter(Boolean);
    return items.length ? items : fallback;
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return fallback;
}

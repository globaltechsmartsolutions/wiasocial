import { z } from "zod";

/**
 * Contratos tipados de la tarea `content.studio` (Content Studio).
 *
 * Hay dos capas deliberadamente separadas (§8.2 de la arquitectura):
 * - `CONTENT_STUDIO_PROVIDER_SCHEMA`: esquema JSON estricto de FORMA que se
 *   envía al proveedor (Structured Outputs). No lleva rangos porque los
 *   proveedores no los validan.
 * - `contentStudioOutputSchema` (Zod): validación de servidor con rangos y
 *   reglas de negocio. Ninguna capa sustituye a la otra.
 */

const CAROUSEL_TEMPLATE_IDS = [
  "myth_busting",
  "mistake_fix",
  "checklist",
  "objection_handler",
  "case_study",
  "direct_offer",
  "educational",
  "comparison",
  "before_after",
] as const;

const shortText = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const contentStudioInputSchema = z.object({
  niche: requiredText(160),
  audience: requiredText(400),
  offer: requiredText(600),
  goal: shortText(60).default("leads"),
  tone: shortText(60).default("professional"),
  format: shortText(40).default("carousel"),
  funnelStage: shortText(40).default("conversion"),
  commercialIntensity: shortText(40).default("balanced"),
  preferredTemplateId: shortText(40).default(""),
  keyMessage: shortText(800).default(""),
  objection: shortText(500).default(""),
  proof: shortText(500).default(""),
  desiredAction: shortText(300).default(""),
  locale: z.enum(["es", "en"]).default("es"),
});

export type ContentStudioInput = z.infer<typeof contentStudioInputSchema>;

const contentRouteSchema = z.object({
  templateId: z.enum(CAROUSEL_TEMPLATE_IDS),
  templateName: z.string(),
  topicSummary: z.string(),
  intent: z.string(),
  reasoning: z.string(),
  slidePattern: z.array(z.string()).min(1),
  visualStyle: z.string(),
});

const strategySchema = z.object({
  angle: z.string(),
  promise: z.string(),
  audiencePain: z.string(),
  conversionIntent: z.string(),
  recommendedFormat: z.enum(["reel", "carousel", "stories", "post"]),
  whyThisWillWork: z.string(),
});

const primaryPieceSchema = z.object({
  title: z.string(),
  hook: z.string().min(1),
  caption: z.string().min(1),
  cta: z.string().min(1),
  reelScript: z.string(),
  publishingNotes: z.string(),
});

const variantSchema = z.object({
  label: z.string(),
  angle: z.string(),
  hook: z.string(),
  caption: z.string(),
  cta: z.string(),
});

const carouselSlideSchema = z.object({
  slide: z.number().int().min(1),
  type: z.string(),
  headline: z.string(),
  support: z.string(),
  visualCue: z.string(),
});

const storySlideSchema = z.object({
  slide: z.number().int().min(1),
  type: z.enum(["hook", "context", "proof", "engagement", "cta"]),
  text: z.string(),
  sticker: z.string(),
  cta: z.string(),
});

const visualDirectionSchema = z.object({
  template: z.string(),
  mood: z.string(),
  palette: z.array(z.string()).min(1).max(8),
  coverIdea: z.string(),
  assetPrompts: z.array(z.string()).min(1),
});

const qualityReviewSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  improvements: z.array(z.string()),
});

export const contentStudioOutputSchema = z.object({
  contentRoute: contentRouteSchema,
  strategy: strategySchema,
  primaryPiece: primaryPieceSchema,
  variants: z.array(variantSchema).min(1).max(5),
  carousel: z.array(carouselSlideSchema).min(3).max(12),
  stories: z.array(storySlideSchema).min(1).max(8),
  dmFollowUp: z.string(),
  visualDirection: visualDirectionSchema,
  qualityReview: qualityReviewSchema,
  hook: z.string().min(1),
  reelScript: z.string(),
  caption: z.string().min(1),
  cta: z.string().min(1),
  hashtags: z.array(z.string()).max(40),
  storySequence: z.array(z.string()),
  dmReplyTemplate: z.string(),
});

export type ContentStudioOutput = z.infer<typeof contentStudioOutputSchema>;

function strictObject(
  properties: Record<string, unknown>
): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  };
}

const str = { type: "string" } as const;
const strArray = { type: "array", items: { type: "string" } } as const;

/**
 * Esquema estricto para Structured Outputs del proveedor. Solo forma: los
 * rangos (score 0-100, mínimos de arrays) los valida `contentStudioOutputSchema`
 * en servidor. Un test comprueba que las claves coinciden con el esquema Zod.
 */
export const CONTENT_STUDIO_PROVIDER_SCHEMA = strictObject({
  contentRoute: strictObject({
    templateId: { type: "string", enum: [...CAROUSEL_TEMPLATE_IDS] },
    templateName: str,
    topicSummary: str,
    intent: str,
    reasoning: str,
    slidePattern: strArray,
    visualStyle: str,
  }),
  strategy: strictObject({
    angle: str,
    promise: str,
    audiencePain: str,
    conversionIntent: str,
    recommendedFormat: { type: "string", enum: ["reel", "carousel", "stories", "post"] },
    whyThisWillWork: str,
  }),
  primaryPiece: strictObject({
    title: str,
    hook: str,
    caption: str,
    cta: str,
    reelScript: str,
    publishingNotes: str,
  }),
  variants: {
    type: "array",
    items: strictObject({ label: str, angle: str, hook: str, caption: str, cta: str }),
  },
  carousel: {
    type: "array",
    items: strictObject({
      slide: { type: "integer" },
      type: str,
      headline: str,
      support: str,
      visualCue: str,
    }),
  },
  stories: {
    type: "array",
    items: strictObject({
      slide: { type: "integer" },
      type: { type: "string", enum: ["hook", "context", "proof", "engagement", "cta"] },
      text: str,
      sticker: str,
      cta: str,
    }),
  },
  dmFollowUp: str,
  visualDirection: strictObject({
    template: str,
    mood: str,
    palette: strArray,
    coverIdea: str,
    assetPrompts: strArray,
  }),
  qualityReview: strictObject({
    score: { type: "number" },
    strengths: strArray,
    risks: strArray,
    improvements: strArray,
  }),
  hook: str,
  reelScript: str,
  caption: str,
  cta: str,
  hashtags: strArray,
  storySequence: strArray,
  dmReplyTemplate: str,
});

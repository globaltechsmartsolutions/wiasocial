import { NextResponse } from "next/server";
import { buildTemplateRouterPromptContext, routeContentTemplate } from "@/lib/content-template-router";
import type { CarouselTemplateId, PremiumCarouselSlide } from "@/types";

type PreviewRequest = {
  topic?: string;
  templateId?: CarouselTemplateId | "auto" | "";
};

function getGeminiKey() {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
}

function parseJsonObject(text: string) {
  const clean = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  const candidate = firstBrace >= 0 && lastBrace > firstBrace ? clean.slice(firstBrace, lastBrace + 1) : clean;

  try {
    return JSON.parse(candidate);
  } catch {
    throw new Error("Gemini devolvió JSON incompleto. Vuelve a pulsar Generar IA o prueba un topic más concreto.");
  }
}

const PREVIEW_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    contentRoute: {
      type: "OBJECT",
      properties: {
        templateId: { type: "STRING" },
        templateName: { type: "STRING" },
        topicSummary: { type: "STRING" },
        intent: { type: "STRING" },
        reasoning: { type: "STRING" },
        slidePattern: { type: "ARRAY", items: { type: "STRING" } },
        visualStyle: { type: "STRING" },
      },
      required: ["templateId", "templateName", "topicSummary", "intent", "reasoning", "slidePattern", "visualStyle"],
    },
    carousel: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          slide: { type: "NUMBER" },
          type: { type: "STRING" },
          headline: { type: "STRING" },
          support: { type: "STRING" },
          visualCue: { type: "STRING" },
        },
        required: ["slide", "type", "headline", "support", "visualCue"],
      },
    },
    caption: { type: "STRING" },
    cta: { type: "STRING" },
  },
  required: ["contentRoute", "carousel", "caption", "cta"],
};

function normalizeSlide(value: unknown, index: number): PremiumCarouselSlide {
  const row = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    slide: Number(row.slide) || index + 1,
    type: typeof row.type === "string" && row.type.trim() ? row.type.trim() : index === 0 ? "cover" : "insight",
    headline: typeof row.headline === "string" && row.headline.trim() ? row.headline.trim() : index === 0 ? "Idea principal" : `Slide ${index + 1}`,
    support: typeof row.support === "string" ? row.support.trim() : "",
    visualCue: typeof row.visualCue === "string" && row.visualCue.trim()
      ? row.visualCue.trim()
      : "Diseño editorial con jerarquía clara y texto legible.",
  };
}

function getGeminiModelCandidates() {
  return [
    process.env.CONTENT_STUDIO_GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
  ].filter((model, index, models): model is string => Boolean(model) && models.indexOf(model) === index);
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const apiKey = getGeminiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Falta GOOGLE_GENERATIVE_AI_API_KEY o GEMINI_API_KEY" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as PreviewRequest;
  const topic = body.topic?.trim() || "captar pacientes para una clínica dental premium";
  const preferredTemplateId = body.templateId && body.templateId !== "auto" ? body.templateId : "";
  const route = routeContentTemplate({ topic, preferredTemplateId });
  const routerContext = buildTemplateRouterPromptContext(route);
  const prompt = `Genera un carrusel premium de Instagram en español para este topic:
${topic}

${routerContext}

Reglas:
- Devuelve SOLO JSON válido.
- Si el usuario ha forzado una plantilla, respeta el templateId recomendado.
- No pegues el topic completo en la portada. Extrae un concepto corto.
- Cada titular debe ser corto, natural y publicable.
- El carrusel debe seguir el slidePattern elegido.
- No inventes resultados, cifras ni claims médicos/comerciales no aportados.
- El contenido debe sonar nativo de Instagram, no como blog.
- Genera exactamente ${route.slidePattern.length} slides, una por cada paso del slidePattern.
- La ultima slide debe pedir una sola accion concreta.

Formato exacto:
{
  "contentRoute": {
    "templateId": "${route.templateId}",
    "templateName": "${route.templateName}",
    "topicSummary": "concepto corto",
    "intent": "${route.intent}",
    "reasoning": "por qué esta plantilla funciona",
    "slidePattern": ${JSON.stringify(route.slidePattern)},
    "visualStyle": "${route.visualStyle}"
  },
  "carousel": [
    { "slide": 1, "type": "cover", "headline": "string", "support": "string", "visualCue": "string" }
  ],
  "caption": "caption breve para acompañar el carrusel",
  "cta": "acción concreta"
}`;

  let data: Record<string, unknown> | null = null;
  let usedModel = "";
  let lastError = "Gemini request failed";

  for (const model of getGeminiModelCandidates()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "Eres director creativo senior de Instagram. Responde siempre con JSON válido, sin markdown." }],
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: PREVIEW_RESPONSE_SCHEMA,
          temperature: 0.75,
          maxOutputTokens: 4096,
        },
      }),
    });

    const candidateData = await response.json();
    if (response.ok) {
      data = candidateData;
      usedModel = model;
      break;
    }

    const message = candidateData.error?.message || candidateData.error || "Gemini request failed";
    lastError = typeof message === "string" ? message : JSON.stringify(message);
  }

  if (!data) return NextResponse.json({ error: lastError }, { status: 502 });

  const text = (data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined)
    ?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
  if (!text) return NextResponse.json({ error: "Gemini no devolvió contenido" }, { status: 502 });

  let generated: Record<string, unknown>;
  try {
    generated = parseJsonObject(text) as Record<string, unknown>;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gemini devolvió una respuesta no válida" },
      { status: 502 }
    );
  }
  const slides = Array.isArray(generated.carousel)
    ? generated.carousel.map(normalizeSlide).slice(0, 8)
    : [];

  return NextResponse.json({
    ok: true,
    model: usedModel,
    contentRoute: generated.contentRoute || route,
    carousel: slides,
    caption: typeof generated.caption === "string" ? generated.caption : "",
    cta: typeof generated.cta === "string" ? generated.cta : "",
  });
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const casesPath = join(__dirname, "model-bakeoff", "cases.json");

loadEnvFile(join(rootDir, ".env.local"));

const args = parseArgs(process.argv.slice(2));
const cases = JSON.parse(readFileSync(casesPath, "utf8"));
const selectedCases = filterCases(cases, args.cases);
const providers = getProviders(args.providers);
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = args.out || join(rootDir, ".model-bakeoff", runId);

const resultSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "strategy",
    "primaryPiece",
    "variants",
    "carousel",
    "stories",
    "dmFollowUp",
    "visualDirection",
    "qualityReview",
  ],
  properties: {
    strategy: {
      type: "object",
      additionalProperties: false,
      required: ["objective", "angle", "promise", "audiencePain", "conversionIntent"],
      properties: {
        objective: { type: "string" },
        angle: { type: "string" },
        promise: { type: "string" },
        audiencePain: { type: "string" },
        conversionIntent: { type: "string" },
      },
    },
    primaryPiece: {
      type: "object",
      additionalProperties: false,
      required: ["format", "hook", "script", "caption", "cta"],
      properties: {
        format: { type: "string" },
        hook: { type: "string" },
        script: { type: "string" },
        caption: { type: "string" },
        cta: { type: "string" },
      },
    },
    variants: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "hook", "angle"],
        properties: {
          label: { type: "string" },
          hook: { type: "string" },
          angle: { type: "string" },
        },
      },
    },
    carousel: {
      type: "array",
      minItems: 6,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slide", "title", "body"],
        properties: {
          slide: { type: "integer" },
          title: { type: "string" },
          body: { type: "string" },
        },
      },
    },
    stories: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slide", "type", "text", "interaction"],
        properties: {
          slide: { type: "integer" },
          type: { type: "string" },
          text: { type: "string" },
          interaction: { type: "string" },
        },
      },
    },
    dmFollowUp: {
      type: "object",
      additionalProperties: false,
      required: ["trigger", "message"],
      properties: {
        trigger: { type: "string" },
        message: { type: "string" },
      },
    },
    visualDirection: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string" },
    },
    qualityReview: {
      type: "object",
      additionalProperties: false,
      required: ["score", "strengths", "risks", "whyItIsPublishable"],
      properties: {
        score: { type: "integer" },
        strengths: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } },
        whyItIsPublishable: { type: "string" },
      },
    },
  },
};

const systemPrompt = `Eres el equipo creativo senior de WIASocial para Instagram.
Trabajas como estratega, copywriter y editor crítico.
Tu objetivo no es escribir "contenido viral" genérico, sino una pieza publicable, específica y con intención comercial.

Reglas:
- Escribe en castellano natural de España/LatAm, sin sonar traducido.
- Evita clichés como "lleva tu negocio al siguiente nivel", "transforma tu vida" o "descubre el secreto".
- No prometas resultados garantizados, curas, ingresos o cambios imposibles.
- No sugieras bots, scraping, automatización abusiva ni engagement falso.
- Mantén el contenido alineado con la oferta y el público.
- Respeta exactamente la acción deseada del brief. Si pide DM, no cambies a comentario público.
- Prioriza claridad, especificidad, tensión narrativa y CTA útil.
- En qualityReview.score usa una puntuación de 0 a 100.
- Devuelve solo JSON válido con el esquema solicitado.`;

if (args.dryRun) {
  printDryRun(selectedCases, providers, outDir);
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "cases.json"), JSON.stringify(selectedCases, null, 2));
writeFileSync(join(outDir, "providers.json"), JSON.stringify(providers.map(safeProvider), null, 2));

const summary = [];

for (const provider of providers) {
  if (!provider.apiKey) {
    console.log(`Saltando ${provider.id}: falta ${provider.keyEnv}`);
    summary.push({ provider: provider.id, skipped: true, reason: `Falta ${provider.keyEnv}` });
    continue;
  }
  if (!provider.model) {
    console.log(`Saltando ${provider.id}: falta configurar modelo`);
    summary.push({ provider: provider.id, skipped: true, reason: "Falta configurar modelo" });
    continue;
  }

  for (const testCase of selectedCases) {
    const startedAt = Date.now();
    const resultPath = join(outDir, `${provider.id}__${testCase.id}.json`);
    console.log(`Probando ${provider.id} con ${testCase.id}...`);

    try {
      const userPrompt = buildUserPrompt(testCase);
      const raw = await withRetries(() => callProvider(provider, systemPrompt, userPrompt, resultSchema));
      const parsed = parseJsonOutput(raw.text);
      const elapsedMs = Date.now() - startedAt;
      const payload = {
        provider: safeProvider(provider),
        case: testCase,
        elapsedMs,
        usage: raw.usage ?? null,
        output: parsed,
        rawText: raw.text,
      };
      writeFileSync(resultPath, JSON.stringify(payload, null, 2));
      summary.push({
        provider: provider.id,
        caseId: testCase.id,
        ok: true,
        elapsedMs,
        outputPath: resultPath,
        qualitySelfScore: parsed.qualityReview?.score ?? null,
      });
    } catch (err) {
      const elapsedMs = Date.now() - startedAt;
      const message = err instanceof Error ? err.message : String(err);
      writeFileSync(resultPath, JSON.stringify({
        provider: safeProvider(provider),
        case: testCase,
        elapsedMs,
        error: message,
      }, null, 2));
      summary.push({
        provider: provider.id,
        caseId: testCase.id,
        ok: false,
        elapsedMs,
        error: message,
        outputPath: resultPath,
      });
      console.error(`Error en ${provider.id}/${testCase.id}: ${message}`);
    }
  }
}

writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
writeFileSync(join(outDir, "README.md"), buildRunReadme(summary));
console.log(`Bake-off terminado. Resultados en ${outDir}`);

function getProviders(providerArg) {
  const defaults = [
    {
      id: "openai-configured",
      provider: "openai",
      model: process.env.CONTENT_STUDIO_OPENAI_MODEL || process.env.CONTENT_STUDIO_PREMIUM_MODEL || "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
      keyEnv: "OPENAI_API_KEY",
    },
    {
      id: "anthropic-configured",
      provider: "anthropic",
      model: process.env.CONTENT_STUDIO_ANTHROPIC_MODEL || "",
      apiKey: process.env.ANTHROPIC_API_KEY,
      keyEnv: "ANTHROPIC_API_KEY",
    },
    {
      id: "anthropic-fast-configured",
      provider: "anthropic",
      model: process.env.CONTENT_STUDIO_ANTHROPIC_FAST_MODEL || "",
      apiKey: process.env.ANTHROPIC_API_KEY,
      keyEnv: "ANTHROPIC_API_KEY",
    },
    {
      id: "gemini-configured",
      provider: "gemini",
      model: process.env.CONTENT_STUDIO_GEMINI_MODEL || "gemini-2.5-flash",
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
      keyEnv: "GOOGLE_GENERATIVE_AI_API_KEY",
    },
    {
      id: "mistral-configured",
      provider: "mistral",
      model: process.env.CONTENT_STUDIO_MISTRAL_MODEL || "",
      apiKey: process.env.MISTRAL_API_KEY,
      keyEnv: "MISTRAL_API_KEY",
    },
  ];

  if (!providerArg) return defaults;

  const wanted = new Set(providerArg.split(",").map((item) => item.trim()).filter(Boolean));
  return defaults.filter((provider) => wanted.has(provider.id) || wanted.has(provider.provider));
}

function buildUserPrompt(testCase) {
  return `Genera una pieza premium para Instagram con estos datos:

CASO:
${JSON.stringify(testCase, null, 2)}

ENTREGA:
- Una estrategia clara.
- Una pieza principal completa.
- 3 a 5 variantes de hook.
- Carrusel de 6 a 8 slides.
- 5 stories.
- DM de seguimiento.
- Ideas visuales.
- Crítica de calidad.

Recuerda: el contenido debe ser específico, publicable y orientado a negocio.`;
}

async function callProvider(provider, system, user, schema) {
  if (provider.provider === "openai") return callOpenAI(provider, system, user, schema);
  if (provider.provider === "anthropic") return callAnthropic(provider, system, user, schema);
  if (provider.provider === "gemini") return callGemini(provider, system, user, schema);
  if (provider.provider === "mistral") return callMistral(provider, system, user, schema);
  throw new Error(`Proveedor no soportado: ${provider.provider}`);
}

async function callOpenAI(provider, system, user, schema) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        { role: "user", content: [{ type: "input_text", text: user }] },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "content_studio_result",
          strict: true,
          schema,
        },
      },
      reasoning: { effort: "medium" },
    }),
  });
  const data = await readJsonResponse(res);
  return {
    text: extractOpenAIText(data),
    usage: data.usage,
  };
}

async function callAnthropic(provider, system, user, schema) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": provider.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 6000,
      system,
      messages: [{ role: "user", content: user }],
      output_config: {
        format: {
          type: "json_schema",
          schema,
        },
      },
    }),
  });
  const data = await readJsonResponse(res);
  return {
    text: data.content?.find((part) => part.type === "text")?.text ?? "",
    usage: data.usage,
  };
}

async function callGemini(provider, system, user, schema) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(provider.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: user }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: toGeminiSchema(schema),
      },
    }),
  });
  const data = await readJsonResponse(res);
  return {
    text: data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "",
    usage: data.usageMetadata,
  };
}

function toGeminiSchema(schema) {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (!schema || typeof schema !== "object") return schema;

  const unsupported = new Set(["additionalProperties"]);
  const next = {};
  for (const [key, value] of Object.entries(schema)) {
    if (unsupported.has(key)) continue;
    next[key] = toGeminiSchema(value);
  }
  return next;
}

async function callMistral(provider, system, user, schema) {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "content_studio_result",
          strict: true,
          schema,
        },
      },
    }),
  });
  const data = await readJsonResponse(res);
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    usage: data.usage,
  };
}

async function readJsonResponse(res) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Respuesta no JSON (${res.status}): ${text.slice(0, 500)}`);
  }

  if (!res.ok) {
    const message = data.error?.message || data.error || text;
    const error = new Error(`HTTP ${res.status}: ${typeof message === "string" ? message : JSON.stringify(message)}`);
    error.status = res.status;
    throw error;
  }

  return data;
}

async function withRetries(task, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (err) {
      lastError = err;
      const status = err && typeof err === "object" ? err.status : undefined;
      if (!isRetryableStatus(status) || attempt === attempts) break;
      const delayMs = 1500 * attempt;
      console.log(`Error temporal HTTP ${status}; reintento ${attempt + 1}/${attempts} en ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function isRetryableStatus(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function extractOpenAIText(data) {
  if (data.output_text) return data.output_text;
  const chunks = [];
  for (const item of data.output ?? []) {
    for (const part of item.content ?? []) {
      if (part.type === "output_text" || part.type === "text") chunks.push(part.text);
    }
  }
  return chunks.join("");
}

function parseJsonOutput(text) {
  if (!text?.trim()) throw new Error("Respuesta vacía");
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`No se pudo extraer JSON: ${text.slice(0, 300)}`);
    return JSON.parse(match[0]);
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (const arg of argv) {
    if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg.startsWith("--providers=")) parsed.providers = arg.slice("--providers=".length);
    else if (arg.startsWith("--cases=")) parsed.cases = arg.slice("--cases=".length);
    else if (arg.startsWith("--out=")) parsed.out = arg.slice("--out=".length);
  }
  return parsed;
}

function filterCases(allCases, casesArg) {
  if (!casesArg) return allCases;
  const wanted = new Set(casesArg.split(",").map((item) => item.trim()).filter(Boolean));
  return allCases.filter((testCase) => wanted.has(testCase.id));
}

function printDryRun(testCases, selectedProviders, outputDirectory) {
  console.log("Bake-off Content Studio");
  console.log(`Casos: ${testCases.map((item) => item.id).join(", ")}`);
  console.log(`Proveedores: ${selectedProviders.map((item) => {
    if (!item.apiKey) return `${item.id} (sin key)`;
    if (!item.model) return `${item.id} (sin modelo)`;
    return item.id;
  }).join(", ")}`);
  console.log(`Salida: ${outputDirectory}`);
  console.log("");
  console.log("Ejecuta sin --dry-run cuando hayas configurado las API keys.");
}

function safeProvider(provider) {
  return {
    id: provider.id,
    provider: provider.provider,
    model: provider.model,
    keyEnv: provider.keyEnv,
  };
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function buildRunReadme(rows) {
  const ok = rows.filter((row) => row.ok).length;
  const failed = rows.filter((row) => row.ok === false).length;
  const skipped = rows.filter((row) => row.skipped).length;
  return `# Resultado bake-off Content Studio

- OK: ${ok}
- Fallidos: ${failed}
- Saltados: ${skipped}

Revisa \`summary.json\` y los archivos por proveedor/caso. La puntuación final debe hacerse con revisión humana usando la rúbrica del documento \`docs/COMPARATIVA-MODELOS-CONTENT-STUDIO.md\`.
`;
}

import { describe, expect, it } from "vitest";
import { AIGatewayError, createModelGateway, type OpenAIChatLike } from "@/lib/ai/gateway";

class FakeProviderError extends Error {
  status?: number;
  constructor(message: string, status?: number, name = "Error") {
    super(message);
    this.status = status;
    this.name = name;
  }
}

interface FakeCall {
  body: Record<string, unknown>;
  options: { timeout: number; maxRetries: number };
}

function fakeClient(
  responses: Array<(() => never) | { content: string; usage?: { prompt_tokens: number; completion_tokens: number } }>
) {
  const calls: FakeCall[] = [];
  let index = 0;
  const client: OpenAIChatLike = {
    chat: {
      completions: {
        async create(body, options) {
          calls.push({ body: body as Record<string, unknown>, options });
          const next = responses[Math.min(index, responses.length - 1)];
          index += 1;
          if (typeof next === "function") next();
          const ok = next as { content: string; usage?: { prompt_tokens: number; completion_tokens: number } };
          return {
            choices: [{ message: { content: ok.content } }],
            usage: ok.usage,
          };
        },
      },
    },
  };
  return { client, calls };
}

function gatewayWith(client: OpenAIChatLike) {
  return createModelGateway({
    client,
    isConfigured: () => true,
    sleep: async () => {},
    log: () => {},
  });
}

const baseRequest = {
  taskId: "content",
  modelAlias: "TEXT_STANDARD_PRIMARY" as const,
  system: "system",
  messages: [{ role: "user" as const, content: "hola" }],
  maxOutputTokens: 500,
  timeoutMs: 12_345,
  maxAttempts: 2,
  temperature: 0.5,
};

describe("ModelGateway (adaptador OpenAI)", () => {
  it("envía store:false, límites y timeout, y registra tokens, latencia y coste", async () => {
    const { client, calls } = fakeClient([
      { content: '{"ok":true}', usage: { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 } },
    ]);
    const result = await gatewayWith(client).generate({ ...baseRequest, modelOverride: "gpt-4o-mini" });

    expect(calls).toHaveLength(1);
    expect(calls[0].body.store).toBe(false);
    expect(calls[0].body.max_tokens).toBe(500);
    expect(calls[0].body.temperature).toBe(0.5);
    expect(calls[0].body.response_format).toEqual({ type: "json_object" });
    expect(calls[0].options.timeout).toBe(12_345);
    expect(calls[0].options.maxRetries).toBe(0);

    expect(result.json).toEqual({ ok: true });
    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o-mini");
    expect(result.inputTokens).toBe(1_000_000);
    expect(result.outputTokens).toBe(1_000_000);
    expect(result.estimatedCostUsd).toBeCloseTo(0.75);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.attempts).toBe(1);
  });

  it("normaliza errores de autenticación y no reintenta", async () => {
    const { client, calls } = fakeClient([
      () => {
        throw new FakeProviderError("bad key", 401);
      },
    ]);
    const error = await gatewayWith(client)
      .generate(baseRequest)
      .catch((err) => err);

    expect(error).toBeInstanceOf(AIGatewayError);
    expect((error as AIGatewayError).code).toBe("auth");
    expect(calls).toHaveLength(1);
  });

  it("distingue la falta de saldo de un límite de peticiones y no reintenta", async () => {
    // OpenAI devuelve 429 en ambos casos; reintentar sin saldo nunca funciona.
    const noCredit = Object.assign(new FakeProviderError("You have no credits remaining.", 429), {
      code: "credit_balance_exhausted",
      type: "insufficient_quota",
    });
    const { client, calls } = fakeClient([
      () => {
        throw noCredit;
      },
    ]);
    const error = await gatewayWith(client)
      .generate({ ...baseRequest, maxAttempts: 3 })
      .catch((err) => err);

    expect((error as AIGatewayError).code).toBe("insufficient_credit");
    expect((error as AIGatewayError).retryable).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it("reintenta límites de peticiones del proveedor hasta maxAttempts", async () => {
    const { client, calls } = fakeClient([
      () => {
        throw new FakeProviderError("rate limited", 429);
      },
      { content: '{"ok":1}' },
    ]);
    const result = await gatewayWith(client).generate(baseRequest);
    expect(calls).toHaveLength(2);
    expect(result.attempts).toBe(2);
  });

  it("normaliza timeouts como errores reintentables", async () => {
    const { client, calls } = fakeClient([
      () => {
        throw new FakeProviderError("Request timed out", undefined, "APIConnectionTimeoutError");
      },
    ]);
    const error = await gatewayWith(client)
      .generate({ ...baseRequest, maxAttempts: 2 })
      .catch((err) => err);

    expect((error as AIGatewayError).code).toBe("timeout");
    expect((error as AIGatewayError).retryable).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it("marca como invalid_output el JSON corrupto del proveedor", async () => {
    const { client } = fakeClient([{ content: "esto no es JSON {" }]);
    const error = await gatewayWith(client)
      .generate({ ...baseRequest, maxAttempts: 1 })
      .catch((err) => err);

    expect((error as AIGatewayError).code).toBe("invalid_output");
  });

  it("marca como invalid_output la respuesta vacía", async () => {
    const { client } = fakeClient([{ content: "   " }]);
    const error = await gatewayWith(client)
      .generate({ ...baseRequest, maxAttempts: 1 })
      .catch((err) => err);

    expect((error as AIGatewayError).code).toBe("invalid_output");
  });

  it("falla con not_configured si no hay credenciales", async () => {
    const gateway = createModelGateway({
      client: fakeClient([{ content: "{}" }]).client,
      isConfigured: () => false,
      sleep: async () => {},
      log: () => {},
    });
    const error = await gateway.generate(baseRequest).catch((err) => err);
    expect((error as AIGatewayError).code).toBe("not_configured");
  });

  it("usa max_tokens y temperature con los modelos de chat clásicos", async () => {
    const { client, calls } = fakeClient([{ content: "{}" }]);
    await gatewayWith(client).generate({ ...baseRequest, modelOverride: "gpt-4o-mini" });

    expect(calls[0].body.max_tokens).toBe(500);
    expect(calls[0].body.max_completion_tokens).toBeUndefined();
    expect(calls[0].body.temperature).toBe(0.5);
  });

  it("cambia a max_completion_tokens y omite temperature en modelos de razonamiento", async () => {
    for (const model of ["o3-mini", "gpt-5.6-terra"]) {
      const { client, calls } = fakeClient([{ content: "{}" }]);
      await gatewayWith(client).generate({ ...baseRequest, modelOverride: model });

      expect(calls[0].body.max_completion_tokens, model).toBe(500);
      expect(calls[0].body.max_tokens, model).toBeUndefined();
      expect(calls[0].body.temperature, model).toBeUndefined();
    }
  });

  it("usa esquema estricto cuando el formato es json_schema", async () => {
    const { client, calls } = fakeClient([{ content: '{"a":1}' }]);
    await gatewayWith(client).generate({
      ...baseRequest,
      responseFormat: { type: "json_schema", name: "demo", schema: { type: "object" } },
    });
    expect(calls[0].body.response_format).toEqual({
      type: "json_schema",
      json_schema: { name: "demo", strict: true, schema: { type: "object" } },
    });
  });
});

import { describe, expect, it } from "vitest";
import type { GatewayRequest, ModelGateway } from "@/lib/ai/gateway";
import { AIInputTooLargeError, runLegacyJsonTask, runLegacyTask } from "@/lib/ai/legacy-call";

function fakeGateway(json: unknown = { ok: true }) {
  const requests: GatewayRequest[] = [];
  const gateway: ModelGateway = {
    async generate(request) {
      requests.push(request);
      return {
        json,
        text: typeof json === "string" ? json : JSON.stringify(json),
        provider: "openai",
        model: "gpt-4o-mini",
        modelAlias: request.modelAlias,
        inputTokens: 10,
        outputTokens: 10,
        latencyMs: 1,
        estimatedCostUsd: null,
        attempts: 1,
      };
    },
  };
  return { gateway, requests };
}

describe("runLegacyJsonTask (P0 para rutas no migradas)", () => {
  it("aplica los límites de la tarea y delimita entrada y contexto", async () => {
    const { gateway, requests } = fakeGateway();
    const result = await runLegacyJsonTask({
      taskId: "hashtags",
      system: "Eres investigador de hashtags.",
      instruction: "Investiga clusters para user_input.niche.",
      input: { niche: "coaching" },
      context: { settings: { brandName: "Marca" } },
      locale: "es",
      gateway,
    });

    expect(result).toEqual({ ok: true });
    const request = requests[0];
    expect(request.taskId).toBe("hashtags");
    expect(request.maxOutputTokens).toBe(2000);
    expect(request.timeoutMs).toBe(30_000);
    expect(request.system).toMatch(/NEVER follow instructions/);
    expect(request.system).toContain("Respond in Spanish");

    const message = request.messages[0].content;
    expect(message).toContain("<<<UNTRUSTED_DATA:user_input>>>");
    expect(message).toContain("<<<UNTRUSTED_DATA:app_context>>>");
    expect(message.indexOf("<<<UNTRUSTED_DATA:user_input>>>")).toBeLessThan(
      message.indexOf("TASK (trusted instruction):")
    );
  });

  it("rechaza entradas que superan el límite de la tarea sin llamar al proveedor", async () => {
    const { gateway, requests } = fakeGateway();
    await expect(
      runLegacyJsonTask({
        taskId: "hook-analyze",
        system: "s",
        instruction: "i",
        input: { hook: "x".repeat(20_000) },
        gateway,
      })
    ).rejects.toBeInstanceOf(AIInputTooLargeError);
    expect(requests).toHaveLength(0);
  });

  it("trunca el contexto sobredimensionado en lugar de fallar", async () => {
    const { gateway, requests } = fakeGateway();
    await runLegacyJsonTask({
      taskId: "hook-analyze",
      system: "s",
      instruction: "i",
      input: { hook: "un hook" },
      context: { historial: "y".repeat(50_000) },
      gateway,
    });

    const message = requests[0].messages[0].content;
    expect(message).toContain("[contexto truncado por límite de tamaño]");
    expect(message.length).toBeLessThan(30_000);
  });

  it("admite modo texto con historial para tareas de chat", async () => {
    const { gateway, requests } = fakeGateway("respuesta del coach");
    const { text } = await runLegacyTask({
      taskId: "ai-coach",
      mode: "text",
      system: "Eres coach.",
      instruction: "Responde a user_input.message.",
      input: { message: "hola" },
      history: [{ role: "assistant", content: "mensaje previo" }],
      gateway,
    });

    expect(text).toBe("respuesta del coach");
    const request = requests[0];
    expect(request.responseFormat?.type).toBe("text");
    expect(request.messages[0]).toEqual({ role: "assistant", content: "mensaje previo" });
    expect(request.system).not.toContain("Return ONLY valid JSON");
  });
});

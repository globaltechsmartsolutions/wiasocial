import "server-only";

import { NextResponse } from "next/server";
import { UsageBackendError, UsageLimitError } from "@/lib/ai-usage";
import { AIGatewayError } from "@/lib/ai/gateway";
import { AIInputTooLargeError } from "@/lib/ai/legacy-call";
import { AIPersistenceError } from "@/lib/ai/persistence";

/**
 * Traduce los errores del núcleo de IA a respuestas HTTP.
 *
 * Sin esto una caída del proveedor sale como un 500 con traza, que el cliente
 * muestra como "[object Object]" y deja la página en un estado roto. Cada
 * causa tiene su código para que la interfaz pueda explicar qué ha pasado.
 */
export function respondToAIError(err: unknown, context: string): NextResponse {
  if (err instanceof AIInputTooLargeError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (err instanceof UsageLimitError) {
    return NextResponse.json(
      { error: "USAGE_LIMIT_EXCEEDED", used: err.used, limit: err.limit },
      { status: 429 }
    );
  }

  if (err instanceof UsageBackendError) {
    console.error(`[${context}] contador de uso no disponible:`, err.message);
    return NextResponse.json({ error: "AI_USAGE_UNAVAILABLE" }, { status: 503 });
  }

  if (err instanceof AIPersistenceError) {
    console.error(`[${context}]`, err.message);
    return NextResponse.json({ error: "AI_PERSISTENCE_UNAVAILABLE" }, { status: 503 });
  }

  if (err instanceof AIGatewayError) {
    if (err.code === "insufficient_credit") {
      // Problema de la cuenta del operador, no del usuario final.
      console.error(`[${context}] sin saldo en el proveedor de IA`);
      return NextResponse.json({ error: "AI_PROVIDER_CREDIT_EXHAUSTED" }, { status: 503 });
    }
    if (err.code === "not_configured") {
      return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
    }
    const status = err.code === "timeout" ? 504 : err.code === "rate_limit" ? 503 : 502;
    return NextResponse.json({ error: err.message }, { status });
  }

  console.error(`[${context}] error inesperado:`, err);
  return NextResponse.json({ error: "AI_UNEXPECTED_ERROR" }, { status: 500 });
}

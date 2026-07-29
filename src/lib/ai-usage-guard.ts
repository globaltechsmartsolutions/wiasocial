import "server-only";

import { NextResponse } from "next/server";
import { checkAndIncrementAIUsage, UsageBackendError, UsageLimitError } from "@/lib/ai-usage";

/**
 * Consumes one AI generation slot for the user.
 *
 * Returns a response to send back when the request must not proceed, or null
 * when the caller may continue. A counter that is unreachable blocks the
 * request with a 503: a spending control that fails open is not a control.
 */
export async function enforceAIUsage(userId: string, token: string): Promise<NextResponse | null> {
  try {
    await checkAndIncrementAIUsage(userId, token);
    return null;
  } catch (error) {
    if (error instanceof UsageLimitError) {
      return NextResponse.json(
        { error: "USAGE_LIMIT_EXCEEDED", used: error.used, limit: error.limit },
        { status: 429 }
      );
    }

    if (error instanceof UsageBackendError) {
      console.error("[ai-usage] contador no disponible:", error.message);
      return NextResponse.json({ error: "AI_USAGE_UNAVAILABLE" }, { status: 503 });
    }

    throw error;
  }
}

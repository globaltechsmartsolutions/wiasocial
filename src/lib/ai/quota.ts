import "server-only";

import { checkAndIncrementAIUsage, currentMonthKey, type UsageState } from "@/lib/ai-usage";
import { getSupabaseForUser } from "@/lib/supabase-admin";

/**
 * Gestión de cuota para el flujo migrado (§11 de la arquitectura):
 *
 * 1. `reserve` consume un slot ANTES de llamar al proveedor, de forma atómica
 *    (RPC `increment_ai_usage` con FOR UPDATE: dos generaciones concurrentes
 *    no pueden pasar ambas por el último slot).
 * 2. Si la generación termina bien, la reserva se confirma sin más escrituras.
 * 3. Si el proveedor falla, `release` devuelve el slot (RPC `release_ai_usage`)
 *    para que un fallo ajeno al usuario no consuma su cuota.
 *
 * `release` es best-effort: si la función SQL aún no está migrada, se registra
 * y el comportamiento queda igual que el legacy (slot consumido).
 */

interface QuotaReservation {
  state: UsageState;
  monthKey: string;
}

export interface QuotaManager {
  reserve(): Promise<QuotaReservation>;
  release(reservation: QuotaReservation): Promise<boolean>;
}

export function createQuotaManager(userId: string, token: string): QuotaManager {
  return {
    async reserve() {
      const state = await checkAndIncrementAIUsage(userId, token);
      return { state, monthKey: currentMonthKey() };
    },

    async release(reservation) {
      try {
        const sb = getSupabaseForUser(token);
        const { error } = await sb.rpc("release_ai_usage", {
          p_user_id: userId,
          p_month_key: reservation.monthKey,
        });
        if (error) {
          console.warn(`[ai-quota] no se pudo liberar la reserva: ${error.message}`);
          return false;
        }
        return true;
      } catch (err) {
        console.warn(
          `[ai-quota] no se pudo liberar la reserva: ${err instanceof Error ? err.message : err}`
        );
        return false;
      }
    },
  };
}

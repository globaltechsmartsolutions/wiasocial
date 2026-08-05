import "server-only";

import { reserveAIUsage, type UsageReservation } from "@/lib/ai-usage";
import { getSupabaseForUser } from "@/lib/supabase-admin";

/**
 * Gestión de cuota del flujo migrado (§11 de la arquitectura), con reservas
 * identificadas:
 *
 * 1. `reserve` incrementa el contador y crea una fila `reserved` en la misma
 *    transacción (RPC `reserve_ai_usage`, serializada con FOR UPDATE).
 * 2. `settle` confirma la reserva al terminar bien: queda `settled` y ya no
 *    puede liberarse nunca.
 * 3. `release` devuelve el slot SOLO si esa reserva concreta sigue `reserved`.
 *    La transición de estado es atómica en SQL, así que llamadas repetidas o
 *    concurrentes no pueden decrementar el contador más de una vez.
 *
 * `settle` y `release` son best-effort frente a fallos de red: si no llegan a
 * ejecutarse, la reserva queda `reserved` y el slot consumido (mismo
 * comportamiento que el contador actual, nunca más permisivo).
 */

type QuotaReservation = UsageReservation;

export interface QuotaManager {
  reserve(): Promise<QuotaReservation>;
  settle(reservation: QuotaReservation): Promise<boolean>;
  release(reservation: QuotaReservation): Promise<boolean>;
}

export function createQuotaManager(userId: string, token: string): QuotaManager {
  return {
    async reserve() {
      return reserveAIUsage(userId, token);
    },

    async settle(reservation) {
      try {
        const sb = getSupabaseForUser(token);
        const { data, error } = await sb.rpc("settle_ai_usage_reservation", {
          p_user_id: userId,
          p_reservation_id: reservation.reservationId,
        });
        if (error) throw new Error(error.message);
        return data === true;
      } catch (err) {
        console.warn(
          `[ai-quota] no se pudo confirmar la reserva ${reservation.reservationId}: ${err instanceof Error ? err.message : err}`
        );
        return false;
      }
    },

    async release(reservation) {
      try {
        const sb = getSupabaseForUser(token);
        const { data, error } = await sb.rpc("release_ai_usage_reservation", {
          p_user_id: userId,
          p_reservation_id: reservation.reservationId,
        });
        if (error) throw new Error(error.message);
        const row = (Array.isArray(data) ? data[0] : data) as { released?: boolean } | null;
        return row?.released === true;
      } catch (err) {
        console.warn(
          `[ai-quota] no se pudo liberar la reserva ${reservation.reservationId}: ${err instanceof Error ? err.message : err}`
        );
        return false;
      }
    },
  };
}

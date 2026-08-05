import "server-only";

/**
 * Feature flag del motor nuevo de Content Studio.
 *
 * APAGADO por defecto: el flujo v2 es estricto (exige la migración `ai-core`
 * y `SUPABASE_SERVICE_ROLE_KEY`), así que solo debe activarse en entornos
 * donde ambas cosas estén desplegadas. Activar: `CONTENT_STUDIO_V2=1`.
 * Rollback inmediato sin desplegar código: quitar la variable o ponerla a 0.
 */
export function isContentStudioV2Enabled(): boolean {
  const raw = process.env.CONTENT_STUDIO_V2?.trim().toLowerCase();
  if (!raw) return false;
  return ["1", "true", "on", "v2"].includes(raw);
}

import "server-only";

/**
 * Feature flag del motor nuevo de Content Studio.
 *
 * Activado por defecto. Rollback inmediato sin desplegar código:
 * `CONTENT_STUDIO_V2=0` devuelve la acción `content` a la ruta antigua
 * (llamada monolítica sin persistencia de runs).
 */
export function isContentStudioV2Enabled(): boolean {
  const raw = process.env.CONTENT_STUDIO_V2?.trim().toLowerCase();
  if (!raw) return true;
  return !["0", "false", "off", "legacy", "no"].includes(raw);
}

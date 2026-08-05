import "server-only";

import type { UserAIContext } from "@/lib/ai-context";
import { getTaskSpec, type AITaskId } from "@/lib/ai/task-registry";

/**
 * ContextAssembler (§6.2 de la arquitectura): cada tarea recibe solo el
 * contexto que su política declara, separado en datos internos (agregados
 * calculados por la app) y contenido no confiable (texto escrito por el
 * usuario o importado de redes).
 */

export interface TaskContextSnapshot {
  /** Agregados numéricos y señales calculadas por WIASocial. */
  internal: Record<string, unknown>;
  /** Texto de usuario o importado. Se delimita siempre como no confiable. */
  untrusted: Record<string, unknown>;
}

export function assembleTaskContext(taskId: AITaskId, full: UserAIContext): TaskContextSnapshot {
  const policy = getTaskSpec(taskId).contextPolicy;
  const internal: Record<string, unknown> = {};
  const untrusted: Record<string, unknown> = {};

  if (policy.includes("legacy-full")) {
    // Tareas aún no migradas: contexto completo, pero SIEMPRE tratado como
    // datos no confiables (incluye captions y bios importados de Instagram).
    return { internal: {}, untrusted: { context: full } };
  }

  if (policy.includes("brandSettings") && full.settings) {
    untrusted.brandSettings = {
      brandName: full.settings.brandName,
      instagramHandle: full.settings.instagramHandle,
      niche: full.settings.niche,
      targetAudience: full.settings.targetAudience,
      offer: full.settings.offer,
      defaultTone: full.settings.defaultTone,
      defaultGoal: full.settings.defaultGoal,
    };
  }

  if (policy.includes("brandMemory") && full.settings?.brandMemory) {
    untrusted.brandMemory = full.settings.brandMemory;
  }

  if (policy.includes("growthSignals")) {
    internal.bestFormats = full.growthSignals.bestFormats;
    internal.contentGaps = full.growthSignals.contentGaps;
    // Los títulos de contenido los escribió el usuario: no confiables.
    untrusted.topContent = full.growthSignals.topContent;
  }

  if (policy.includes("instagramProfile") && full.instagram) {
    internal.instagramStats = {
      followers: full.instagram.followers ?? 0,
      following: full.instagram.following ?? 0,
      posts: full.instagram.posts ?? 0,
    };
    untrusted.instagramProfile = {
      username: full.instagram.username,
      biography: full.instagram.biography,
      topPosts: full.instagram.topPosts,
    };
  }

  return { internal, untrusted };
}

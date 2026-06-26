import type {
  AuditIssue,
  AuditAIReport,
  AuditProfileInput,
  AuditScoringResult,
  AuditSubscores,
} from "@/types/audit";

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function bioExplainsWhatAndForWhom(bio: string): boolean {
  const text = bio.toLowerCase();
  const hasAudience = /para|ayudo|coaches|emprend|traders|personas|agencies|clients|help/i.test(text);
  const hasWhat = /trading|coach|marketing|ventas|mentor|curso|servicio|producto|ofrezco|enseño/i.test(text);
  return bio.length >= 40 && hasAudience && hasWhat;
}

function hasClearCta(cta: string, bio: string): boolean {
  const combined = `${cta} ${bio}`.toLowerCase();
  return /dm|escríbeme|link|agenda|reserva|comenta|únete|join|book|click|abajo|below|gratis|free|mentoría|consulta/i.test(combined);
}

export function scoreInstagramProfile(input: AuditProfileInput): AuditScoringResult {
  const issues: AuditIssue[] = [];
  let growthScore = 100;

  const subscores: AuditSubscores = {
    branding: 100,
    bio: 100,
    content: 100,
    conversion: 100,
    authority: 100,
    consistency: 100,
  };

  const deduct = (
    points: number,
    issue: Omit<AuditIssue, "id" | "pointsDeducted">,
    subscoreKeys: (keyof AuditSubscores)[]
  ) => {
    growthScore -= points;
    for (const key of subscoreKeys) subscores[key] -= points * 0.6;
    issues.push({ ...issue, id: `${issue.rule}-${issues.length}`, pointsDeducted: points });
  };

  if (!hasClearCta(input.ctaInBio, input.bio)) {
    deduct(10, {
      severity: "critical",
      rule: "no_clear_cta",
      message: "No hay un CTA claro en la bio.",
      category: "conversion",
    }, ["bio", "conversion"]);
  }

  if (!bioExplainsWhatAndForWhom(input.bio)) {
    deduct(10, {
      severity: "critical",
      rule: "bio_no_clarity",
      message: "La bio no explica claramente qué haces y para quién.",
      category: "bio",
    }, ["bio", "conversion"]);
  }

  if (!input.bioLink.trim()) {
    deduct(8, {
      severity: "warning",
      rule: "no_bio_link",
      message: "No hay link en la bio.",
      category: "conversion",
    }, ["bio", "conversion"]);
  }

  if (!input.hasHighlights) {
    deduct(8, {
      severity: "warning",
      rule: "no_highlights",
      message: "No hay destacados configurados.",
      category: "branding",
    }, ["branding", "conversion"]);
  }

  if (input.profilePhotoQuality === "unclear" || input.profilePhotoQuality === "missing") {
    deduct(7, {
      severity: "warning",
      rule: "weak_profile_photo",
      message: "La foto de perfil no transmite claridad o profesionalidad.",
      category: "branding",
    }, ["branding", "authority"]);
  } else if (input.profilePhotoQuality === "casual") {
    deduct(4, {
      severity: "info",
      rule: "casual_profile_photo",
      message: "La foto de perfil podría ser más profesional para tu nicho.",
      category: "branding",
    }, ["branding"]);
  }

  if (input.postsPerWeek < 3) {
    deduct(10, {
      severity: "critical",
      rule: "low_posting_frequency",
      message: "Publicas menos de 3 veces por semana.",
      category: "consistency",
    }, ["consistency", "content"]);
  }

  if (!input.hasAuthorityContent) {
    deduct(8, {
      severity: "warning",
      rule: "no_authority_content",
      message: "No hay contenido de autoridad visible (educación, casos, prueba social).",
      category: "authority",
    }, ["authority", "content"]);
  }

  if (!input.hasConversionContent) {
    deduct(8, {
      severity: "warning",
      rule: "no_conversion_content",
      message: "No hay contenido orientado a conversión (oferta, CTA, venta).",
      category: "conversion",
    }, ["conversion", "content"]);
  }

  if (input.offerClarity === "none") {
    deduct(12, {
      severity: "critical",
      rule: "no_clear_offer",
      message: "No hay una oferta clara.",
      category: "conversion",
    }, ["conversion", "bio"]);
  } else if (input.offerClarity === "vague") {
    deduct(6, {
      severity: "warning",
      rule: "vague_offer",
      message: "La oferta existe pero no está suficientemente clara.",
      category: "conversion",
    }, ["conversion"]);
  }

  if (!input.displayName.trim()) {
    deduct(3, { severity: "info", rule: "no_display_name", message: "Falta nombre de perfil optimizado.", category: "branding" }, ["branding"]);
  }

  if (input.contentTypes.length < 2) {
    deduct(4, {
      severity: "info",
      rule: "low_content_variety",
      message: "Poca variedad de formatos de contenido.",
      category: "content",
    }, ["content"]);
  }

  growthScore = clamp(growthScore);
  for (const key of Object.keys(subscores) as (keyof AuditSubscores)[]) {
    subscores[key] = clamp(subscores[key]);
  }

  const strengths: string[] = [];
  if (hasClearCta(input.ctaInBio, input.bio)) strengths.push("CTA visible en la bio");
  if (bioExplainsWhatAndForWhom(input.bio)) strengths.push("Bio orientada a audiencia y propuesta");
  if (input.bioLink.trim()) strengths.push("Link en bio activo");
  if (input.hasHighlights) strengths.push("Destacados configurados");
  if (input.profilePhotoQuality === "professional") strengths.push("Foto de perfil profesional");
  if (input.postsPerWeek >= 3) strengths.push("Buena frecuencia de publicación");
  if (input.hasAuthorityContent) strengths.push("Contenido de autoridad presente");
  if (input.hasConversionContent) strengths.push("Contenido de conversión presente");
  if (input.offerClarity === "clear") strengths.push("Oferta clara y entendible");

  const priorities = issues
    .sort((a, b) => b.pointsDeducted - a.pointsDeducted)
    .slice(0, 5)
    .map((i) => i.message);

  return { growthScore, subscores, issues, strengths, priorities };
}

export function scoreLabel(score: number): "excellent" | "good" | "average" | "poor" {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "average";
  return "poor";
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-lime";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export function progressBarColor(score: number): string {
  if (score >= 80) return "bg-lime";
  if (score >= 60) return "bg-amber-400";
  if (score >= 40) return "bg-orange-400";
  return "bg-red-400";
}

export function buildAuditExportMarkdown(
  input: AuditProfileInput,
  scores: AuditScoringResult,
  aiReport: AuditAIReport | null
): string {
  const lines = [
    `# Instagram Audit Pro — @${input.username.replace("@", "")}`,
    ``,
    `## Instagram Growth Score: ${scores.growthScore}/100`,
    ``,
    `### Subscores`,
    `- Branding: ${scores.subscores.branding}`,
    `- Bio: ${scores.subscores.bio}`,
    `- Content: ${scores.subscores.content}`,
    `- Conversion: ${scores.subscores.conversion}`,
    `- Authority: ${scores.subscores.authority}`,
    `- Consistency: ${scores.subscores.consistency}`,
    ``,
    `### Fortalezas`,
    ...scores.strengths.map((s) => `- ${s}`),
    ``,
    `### Prioridades`,
    ...scores.priorities.map((p) => `- ${p}`),
  ];

  if (aiReport) {
    lines.push(
      ``,
      `## Informe IA`,
      aiReport.generalDiagnosis,
      ``,
      `### Nueva bio propuesta`,
      aiReport.proposedBio
    );
  }

  return lines.join("\n");
}

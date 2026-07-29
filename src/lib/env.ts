const PLACEHOLDER_TOKEN = /(?:^|[-_/:.@])(?:your|tu|replace|placeholder|example|sample|dummy|fake|changeme|here|aqui|xxxxx)(?:[-_.:/]|$)/iu;

export function isConfiguredEnvValue(value: string | null | undefined): value is string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.includes("<") || trimmed.includes(">")) return false;
  return !PLACEHOLDER_TOKEN.test(trimmed);
}

export function isConfiguredHttpUrl(value: string | null | undefined): value is string {
  if (!isConfiguredEnvValue(value)) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

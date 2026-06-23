/** Client-safe Instagram config checks — no Node crypto imports */

export function isInstagramLoginConfiguredPublic(): boolean {
  const id =
    process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ??
    process.env.NEXT_PUBLIC_META_APP_ID ??
    "";
  return Boolean(id && !id.includes("your_") && !id.includes("your_meta"));
}

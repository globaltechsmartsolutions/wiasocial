/** Client-safe Instagram config checks — no Node crypto imports */

import { isConfiguredEnvValue } from "@/lib/env";

export function isInstagramLoginConfiguredPublic(): boolean {
  return isConfiguredEnvValue(process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID);
}

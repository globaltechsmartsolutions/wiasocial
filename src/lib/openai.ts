import "server-only";

import OpenAI from "openai";
import { isConfiguredEnvValue } from "@/lib/env";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

export function isOpenAIConfigured(): boolean {
  return isConfiguredEnvValue(process.env.OPENAI_API_KEY);
}

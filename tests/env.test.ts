import { describe, expect, it } from "vitest";

import { isConfiguredEnvValue, isConfiguredHttpUrl } from "../src/lib/env";

describe("environment validation", () => {
  it.each([
    undefined,
    "",
    "your-api-key",
    "https://your-project-ref.supabase.co",
    "tu_clave",
    "replace-me",
    "anon_key_here",
    "dummy-secret",
    "changeMe",
    "<secret>",
    "xxxxx",
  ])("rejects an empty or placeholder value: %s", (value) => {
    expect(isConfiguredEnvValue(value)).toBe(false);
  });

  it("accepts a configured opaque value", () => {
    expect(isConfiguredEnvValue("configured-secret-value")).toBe(true);
  });

  it("accepts only configured HTTP URLs", () => {
    expect(isConfiguredHttpUrl("https://project.supabase.co")).toBe(true);
    expect(isConfiguredHttpUrl("ftp://project.example.com")).toBe(false);
    expect(isConfiguredHttpUrl("not-a-url")).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readJsonObject } from "../src/lib/request-validation";

describe("readJsonObject", () => {
  it("reads a JSON object", async () => {
    const result = await readJsonObject<{ name: string }>(
      new Request("https://example.test", { method: "POST", body: '{"name":"WIA"}' })
    );

    expect(result).toEqual({ ok: true, data: { name: "WIA" } });
  });

  it.each(["not-json", "[]", "null"])("rejects an invalid object body: %s", async (body) => {
    const result = await readJsonObject(
      new Request("https://example.test", { method: "POST", body })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("rejects a declared body that is too large without reading it", async () => {
    const result = await readJsonObject(
      new Request("https://example.test", {
        method: "POST",
        headers: { "Content-Length": "100" },
        body: "{}",
      }),
      10
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it("checks the actual UTF-8 byte length", async () => {
    const result = await readJsonObject(
      new Request("https://example.test", { method: "POST", body: '{"text":"ñññ"}' }),
      10
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });
});

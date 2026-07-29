import { describe, expect, it } from "vitest";
import { safeInternalRedirect } from "../src/lib/safe-redirect";

describe("safeInternalRedirect", () => {
  it("mantiene rutas internas", () => {
    expect(safeInternalRedirect("/campaigns?status=draft")).toBe("/campaigns?status=draft");
  });

  it.each([
    null,
    "",
    "https://example.com",
    "//example.com/path",
    "javascript://alert(1)",
  ])("rechaza un destino externo o inválido: %s", (value) => {
    expect(safeInternalRedirect(value, "/login")).toBe("/login");
  });
});

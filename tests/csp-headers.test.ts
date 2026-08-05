import { afterEach, describe, expect, it, vi } from "vitest";

async function loadCsp(nodeEnv: string): Promise<string> {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.resetModules();
  const config = (await import("../next.config")).default;
  const groups = await config.headers!();
  const header = groups[0].headers.find((item) => item.key === "Content-Security-Policy");
  if (!header) throw new Error("No hay cabecera Content-Security-Policy");
  return header.value;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Content-Security-Policy", () => {
  it("en producción no admite orígenes locales", async () => {
    const csp = await loadCsp("production");

    expect(csp).not.toMatch(/127\.0\.0\.1/u);
    expect(csp).not.toMatch(/localhost/u);
    expect(csp).not.toMatch(/ws:\/\//u);
    // El único backend permitido sigue siendo Supabase por https.
    expect(csp).toContain("connect-src 'self' https://*.supabase.co");
  });

  it("en producción no permite eval en scripts", async () => {
    const csp = await loadCsp("production");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("en desarrollo permite un Supabase local", async () => {
    const csp = await loadCsp("development");

    expect(csp).toContain("http://127.0.0.1:*");
    expect(csp).toContain("http://localhost:*");
    // Y conserva el resto de la política.
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("object-src 'none'");
  });
});

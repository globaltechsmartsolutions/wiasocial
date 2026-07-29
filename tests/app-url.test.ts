import { afterEach, describe, expect, it } from "vitest";

import { getAppUrl } from "../src/lib/app-url";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const originalRailwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;

afterEach(() => {
  if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  if (originalRailwayDomain === undefined) delete process.env.RAILWAY_PUBLIC_DOMAIN;
  else process.env.RAILWAY_PUBLIC_DOMAIN = originalRailwayDomain;
});

describe("getAppUrl", () => {
  it("normalizes a configured public URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://wiasocial-production.up.railway.app/";
    expect(getAppUrl()).toBe("https://wiasocial-production.up.railway.app");
  });

  it("rejects placeholders and falls back to Railway", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://your-project.example.com";
    process.env.RAILWAY_PUBLIC_DOMAIN = "wia.up.railway.app";
    expect(getAppUrl()).toBe("https://wia.up.railway.app");
  });

  it("uses localhost when no deployment URL is configured", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.RAILWAY_PUBLIC_DOMAIN;
    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});

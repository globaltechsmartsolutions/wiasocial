import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  resolveSafeWebhookDestination,
  UnsafeWebhookUrlError,
} from "../src/lib/webhook-delivery";

describe("resolveSafeWebhookDestination", () => {
  it.each([
    "http://example.com/hook",
    "https://localhost/hook",
    "https://127.0.0.1/hook",
    "https://[::1]/hook",
    "https://169.254.169.254/latest/meta-data",
    "https://user:password@example.com/hook",
  ])("bloquea un destino no permitido: %s", async (url) => {
    await expect(resolveSafeWebhookDestination(url)).rejects.toBeInstanceOf(UnsafeWebhookUrlError);
  });
});

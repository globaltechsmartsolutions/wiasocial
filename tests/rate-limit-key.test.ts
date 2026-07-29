import { describe, expect, it } from "vitest";

import { userRateLimitKey } from "../src/lib/rate-limit-key";

describe("userRateLimitKey", () => {
  it("keys authenticated limits by scope and stable user id", () => {
    expect(userRateLimitKey("api-ai", "user-123")).toBe("api-ai:user-123");
  });
});

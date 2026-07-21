import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractApiKeyFromRequest,
  generateApiKey,
  hashApiKey,
  isApiKeyFormat,
  verifyApiKey,
} from "@/lib/auth/apikey";
import { checkRateLimit, unauthenticatedRateLimitHeaders } from "@/lib/api/v1/rate-limit";

describe("api key auth", () => {
  it("hashes and verifies API keys", () => {
    const plaintext = generateApiKey();
    const stored = hashApiKey(plaintext);
    assert.equal(verifyApiKey(plaintext, stored), true);
    assert.equal(verifyApiKey(`${plaintext}x`, stored), false);
    assert.equal(isApiKeyFormat(plaintext), true);
  });

  it("extracts keys from x-api-key and bearer headers", () => {
    const key = generateApiKey();
    const headerRequest = new Request("https://refwatch.ca/api/v1/games/upcoming", {
      headers: { "x-api-key": key },
    });
    const bearerRequest = new Request("https://refwatch.ca/api/v1/games/upcoming", {
      headers: { authorization: `Bearer ${key}` },
    });
    assert.equal(extractApiKeyFromRequest(headerRequest), key);
    assert.equal(extractApiKeyFromRequest(bearerRequest), key);
  });
});

describe("rate limiting", () => {
  it("enforces standard tier limits", () => {
    const keyId = "test-standard-key";
    let last: ReturnType<typeof checkRateLimit> | null = null;
    for (let i = 0; i < 100; i += 1) {
      last = checkRateLimit(keyId, "standard");
      assert.equal(last.allowed, true);
    }
    last = checkRateLimit(keyId, "standard");
    assert.equal(last?.allowed, false);
    assert.equal(last?.remaining, 0);
  });

  it("does not rate limit enterprise keys in practice", () => {
    const keyId = "test-enterprise-key";
    for (let i = 0; i < 150; i += 1) {
      const result = checkRateLimit(keyId, "enterprise");
      assert.equal(result.allowed, true);
    }
  });

  it("tracks unauthenticated clients with standard tier limits", () => {
    const request = new Request("https://refwatch.ca/api/v1/games/upcoming", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const headers = unauthenticatedRateLimitHeaders(request);
    assert.equal(headers["X-RateLimit-Limit"], "100");
    assert.ok(Number(headers["X-RateLimit-Remaining"]) >= 0);
    assert.ok(Number(headers["X-RateLimit-Reset"]) > 0);
  });
});

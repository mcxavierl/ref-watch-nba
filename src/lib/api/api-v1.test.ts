import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashApiKey } from "@/lib/api/hash-api-key";
import { extractApiKey, withApiV1Gateway } from "@/lib/api/gateway";
import { validateApiKey } from "@/lib/api/subscriptions";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import {
  buildLeagueStatsApiPayload,
  isPublicApiLeagueId,
} from "@/lib/api/internal-data";

describe("API v1 gateway", () => {
  it("hashes API keys deterministically", async () => {
    const a = await hashApiKey("rw_test_key");
    const b = await hashApiKey("rw_test_key");
    assert.equal(a, b);
    assert.equal(a.length, 64);
  });

  it("extracts x-api-key and bearer tokens", () => {
    assert.equal(
      extractApiKey(new Request("https://refwatch.ca", { headers: { "x-api-key": "abc" } })),
      "abc",
    );
    assert.equal(
      extractApiKey(
        new Request("https://refwatch.ca", {
          headers: { authorization: "Bearer secret" },
        }),
      ),
      "secret",
    );
    assert.equal(extractApiKey(new Request("https://refwatch.ca")), null);
  });

  it("validateApiKey uses dev seeds when configured", async () => {
    const env = process.env as Record<string, string | undefined>;
    const previous = env.API_V1_SUBSCRIPTIONS_JSON;
    const previousNodeEnv = env.NODE_ENV;
    env.NODE_ENV = "development";
    env.API_V1_SUBSCRIPTIONS_JSON = JSON.stringify([
      { key: "rw_dev_free", tier: "FREE", id: "seed-free" },
    ]);

    try {
      const result = await validateApiKey("rw_dev_free");
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.subscription.tier, "FREE");
        assert.equal(result.subscription.id, "seed-free");
      }

      const invalid = await validateApiKey("rw_dev_missing");
      assert.equal(invalid.ok, false);
    } finally {
      env.API_V1_SUBSCRIPTIONS_JSON = previous;
      env.NODE_ENV = previousNodeEnv;
    }
  });

  it("withApiV1Gateway rejects missing keys", async () => {
    const response = await withApiV1Gateway(new Request("https://refwatch.ca/api/v1/leagues/nba/stats"), async () =>
      Response.json({ ok: true }),
    );
    assert.equal(response.status, 401);
  });

  it("enforceRateLimit allows ENTERPRISE without cap", async () => {
    const env = process.env as Record<string, string | undefined>;
    env.API_V1_RATE_LIMIT_DISABLED = "1";
    const result = await enforceRateLimit("ent-1", "ENTERPRISE");
    assert.equal(result.allowed, true);
    assert.equal(result.limit, null);
  });

  it("internal data helpers recognize league ids and return meta", () => {
    assert.equal(isPublicApiLeagueId("nba"), true);
    assert.equal(isPublicApiLeagueId("invalid"), false);
    const payload = buildLeagueStatsApiPayload("nba");
    assert.equal(payload.league.id, "nba");
    assert.ok(payload.meta.refCount >= 0);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateApiKey } from "@/lib/auth/apikey";
import { withEnterpriseApi } from "@/lib/auth/enterprise-api-middleware";
import { upsertApiKey } from "@/lib/auth/api-key-store";
import { apiSuccess } from "@/lib/api/v1/response";

describe("enterprise API middleware", () => {
  it("returns rate-limit headers on 401 responses", async () => {
    const handler = withEnterpriseApi("/api/v1/test/unauthenticated", async () =>
      apiSuccess({ ok: true }),
    );

    const response = await handler(
      new Request("https://refwatch.ca/api/v1/test/unauthenticated"),
      { params: Promise.resolve({}) },
    );

    assert.equal(response.status, 401);
    assert.ok(response.headers.get("X-RateLimit-Limit"));
    assert.ok(response.headers.get("X-RateLimit-Remaining"));
    assert.ok(response.headers.get("X-RateLimit-Reset"));
  });

  it("returns rate-limit headers on invalid API key responses", async () => {
    const handler = withEnterpriseApi("/api/v1/test/invalid-key", async () =>
      apiSuccess({ ok: true }),
    );

    const response = await handler(
      new Request("https://refwatch.ca/api/v1/test/invalid-key", {
        headers: { "x-api-key": "not-a-valid-key" },
      }),
      { params: Promise.resolve({}) },
    );

    assert.equal(response.status, 401);
    assert.ok(response.headers.get("X-RateLimit-Limit"));
    assert.ok(response.headers.get("X-RateLimit-Remaining"));
    assert.ok(response.headers.get("X-RateLimit-Reset"));
  });

  it("returns rate-limit headers on authenticated success responses", async () => {
    const plaintext = generateApiKey();
    await upsertApiKey({
      id: "key_middleware_test",
      clientId: "client_middleware_test",
      label: "Middleware test key",
      tier: "standard",
      plaintextKey: plaintext,
    });

    const handler = withEnterpriseApi("/api/v1/test/authenticated", async () =>
      apiSuccess({ ok: true }),
    );

    const response = await handler(
      new Request("https://refwatch.ca/api/v1/test/authenticated", {
        headers: { "x-api-key": plaintext },
      }),
      { params: Promise.resolve({}) },
    );

    assert.equal(response.status, 200);
    assert.ok(response.headers.get("X-RateLimit-Limit"));
    assert.ok(response.headers.get("X-RateLimit-Remaining"));
    assert.ok(response.headers.get("X-RateLimit-Reset"));
  });
});

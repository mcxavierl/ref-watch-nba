import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  unauthorizedCronResponse,
  verifyCronSecret,
} from "@/lib/cron/verify-cron-secret";

describe("verify-cron-secret", () => {
  it("rejects missing or invalid authorization", () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "test-secret";

    assert.equal(
      verifyCronSecret(
        new Request("https://refwatch.ca/api/cron/sync-slate", {
          method: "POST",
        }),
      ),
      false,
    );
    assert.equal(
      verifyCronSecret(
        new Request("https://refwatch.ca/api/cron/sync-slate", {
          method: "POST",
          headers: { Authorization: "Bearer wrong" },
        }),
      ),
      false,
    );
    assert.equal(
      verifyCronSecret(
        new Request("https://refwatch.ca/api/cron/sync-slate", {
          method: "POST",
          headers: { Authorization: "Bearer test-secret" },
        }),
      ),
      true,
    );

    process.env.CRON_SECRET = previous;
  });

  it("returns 401 for unauthorized cron calls", () => {
    assert.equal(unauthorizedCronResponse().status, 401);
  });
});

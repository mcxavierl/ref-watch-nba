import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublicFetchUrl } from "@/lib/edge-fetch";

test("isPublicFetchUrl allows production site URLs", () => {
  assert.equal(isPublicFetchUrl("https://refwatch.ca/data/nba/ref-stats.json"), true);
  assert.equal(isPublicFetchUrl("https://api.resend.com/emails"), true);
});

test("isPublicFetchUrl blocks private and binding-only hosts", () => {
  assert.equal(isPublicFetchUrl("http://127.0.0.1/data/nba/ref-stats.json"), false);
  assert.equal(isPublicFetchUrl("http://localhost:8787/data"), false);
  assert.equal(isPublicFetchUrl("https://assets.local/data/nba/ref-stats.json"), false);
  assert.equal(isPublicFetchUrl("https://refwatch.internal/data/nba/ref-stats.json"), false);
  assert.equal(isPublicFetchUrl("http://192.168.1.10/data"), false);
  assert.equal(isPublicFetchUrl("not-a-url"), false);
});

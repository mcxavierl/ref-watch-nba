import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  DATA_JSON_CACHE_CONTROL,
  FEED_CACHE_CONTROL,
  STATIC_ASSET_CACHE_CONTROL,
} from "@/lib/cache-control";

describe("cache-control", () => {
  it("defines data JSON edge cache policy", () => {
    assert.match(DATA_JSON_CACHE_CONTROL, /max-age=3600/);
    assert.match(DATA_JSON_CACHE_CONTROL, /s-maxage=86400/);
    assert.match(DATA_JSON_CACHE_CONTROL, /stale-while-revalidate=600/);
    assert.equal(FEED_CACHE_CONTROL, DATA_JSON_CACHE_CONTROL);
  });

  it("defines immutable static asset cache policy", () => {
    assert.match(STATIC_ASSET_CACHE_CONTROL, /max-age=31536000/);
    assert.match(STATIC_ASSET_CACHE_CONTROL, /immutable/);
  });

  it("ships Cloudflare _headers rules for data and static assets", () => {
    const headers = readFileSync(
      join(process.cwd(), "public", "_headers"),
      "utf8",
    );
    assert.match(headers, /\/data\/\*/);
    assert.match(headers, /max-age=3600, s-maxage=86400, stale-while-revalidate=600/);
    assert.match(headers, /\/logos\/\*/);
    assert.match(headers, /max-age=31536000, immutable/);
  });
});

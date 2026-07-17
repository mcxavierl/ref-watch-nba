import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { LEVERAGE_SPIKE_ANOMALY_ARTICLE } from "@/lib/research-articles/leverage-spike-anomaly";

const ROOT = process.cwd();

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("leverage spike research article", () => {
  it("exposes a succinct on-site article route", () => {
    const page = readSrc("src/app/research/leverage-spike-anomaly/page.tsx");
    assert.match(page, /LEVERAGE_SPIKE_ANOMALY_ARTICLE/);
    assert.match(page, /\/research\/leverage-spike-anomaly/);
  });

  it("keeps read time at about five minutes", () => {
    assert.equal(LEVERAGE_SPIKE_ANOMALY_ARTICLE.readMinutes, 5);
    assert.ok(LEVERAGE_SPIKE_ANOMALY_ARTICLE.sections.length >= 5);
  });

  it("avoids em dashes in user-facing copy", () => {
    const blob = JSON.stringify(LEVERAGE_SPIKE_ANOMALY_ARTICLE);
    assert.doesNotMatch(blob, /\u2014/);
  });
});

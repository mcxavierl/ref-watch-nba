import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatGsniDelta,
  formatGsniIndexScore,
  formatGsniScoreValue,
  formatGsniZ,
  gsniDeltaArrow,
  gsniDeltaFromNeutral,
  gsniDeltaTone,
} from "@/lib/gsni-ui";

describe("gsni-ui", () => {
  it("formats index scores in plain language", () => {
    assert.equal(formatGsniIndexScore(1.23), "Index Score: +1.2");
    assert.equal(formatGsniIndexScore(-0.84), "Index Score: -0.8");
    assert.equal(formatGsniIndexScore(0), "Index Score: 0.0");
    assert.equal(formatGsniZ(1.23), "Index Score: +1.2");
    assert.equal(formatGsniScoreValue(1.23), "+1.2");
    assert.equal(formatGsniScoreValue(-0.84), "-0.8");
    assert.equal(formatGsniScoreValue(0), "0.0");
  });

  it("computes delta tone and arrows from league average", () => {
    assert.equal(gsniDeltaFromNeutral(1.2), 1.2);
    assert.equal(gsniDeltaTone(1.2), "positive");
    assert.equal(gsniDeltaArrow(1.2), "▲");
    assert.equal(formatGsniDelta(1.2), "Index Score: +1.2");
    assert.equal(gsniDeltaTone(-0.8), "negative");
    assert.equal(gsniDeltaArrow(-0.8), "▼");
    assert.equal(formatGsniDelta(-0.8), "Index Score: -0.8");
  });
});

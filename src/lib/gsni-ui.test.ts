import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatGsniDelta,
  formatGsniZ,
  gsniDeltaArrow,
  gsniDeltaFromNeutral,
  gsniDeltaTone,
} from "@/lib/gsni-ui";

describe("gsni-ui", () => {
  it("formats Z-scores to one decimal with sigma suffix", () => {
    assert.equal(formatGsniZ(1.23), "+1.2σ");
    assert.equal(formatGsniZ(-0.84), "-0.8σ");
    assert.equal(formatGsniZ(0), "0.0σ");
  });

  it("computes delta tone and arrows from league mean", () => {
    assert.equal(gsniDeltaFromNeutral(1.2), 1.2);
    assert.equal(gsniDeltaTone(1.2), "positive");
    assert.equal(gsniDeltaArrow(1.2), "▲");
    assert.equal(formatGsniDelta(1.2), "+1.2σ");
    assert.equal(gsniDeltaTone(-0.8), "negative");
    assert.equal(gsniDeltaArrow(-0.8), "▼");
    assert.equal(formatGsniDelta(-0.8), "-0.8σ");
  });
});

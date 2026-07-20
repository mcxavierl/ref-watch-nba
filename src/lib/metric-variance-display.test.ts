import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatVariancePercent,
  variancePercent,
  varianceToneFromDelta,
} from "@/lib/metric-variance-display";

describe("metric variance display helpers", () => {
  it("computes percent delta vs baseline", () => {
    assert.equal(variancePercent(2.6, 13), 20);
    assert.equal(variancePercent(-4.75, 95), -5);
  });

  it("formats signed percent labels", () => {
    assert.equal(formatVariancePercent(40), "+40%");
    assert.equal(formatVariancePercent(-12.5), "-12.5%");
    assert.equal(formatVariancePercent(0), "0%");
  });

  it("maps delta sign to tone", () => {
    assert.equal(varianceToneFromDelta(1.2), "positive");
    assert.equal(varianceToneFromDelta(-0.4), "negative");
    assert.equal(varianceToneFromDelta(0), "neutral");
  });
});

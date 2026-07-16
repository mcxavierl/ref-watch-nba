import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BAYESIAN_PRIOR_STRENGTH,
  adjustedDeltaTooltipText,
  bayesianShrinkDelta,
  dataMaturityPercent,
  dataMaturityScore,
  dataMaturityTier,
  displayWinRateDelta,
  formatDeltaPp,
  formatSampleSizeLabel,
  isPreliminarySample,
  matrixSampleConfidenceLabel,
  matrixSampleConfidenceTier,
  RELIABILITY_FLOOR_GAMES,
  STANDOUT_SPLIT_FOOTNOTE,
} from "@/lib/data-maturity";

describe("data maturity", () => {
  it("flags samples below the reliability floor as preliminary", () => {
    assert.equal(isPreliminarySample(0), false);
    assert.equal(isPreliminarySample(8), true);
    assert.equal(isPreliminarySample(14), true);
    assert.equal(isPreliminarySample(15), false);
    assert.equal(isPreliminarySample(30), false);
  });

  it("shrinks large raw deltas toward zero for thin samples", () => {
    const shrunk = bayesianShrinkDelta(40, 8, BAYESIAN_PRIOR_STRENGTH);
    assert.ok(shrunk > 0);
    assert.ok(shrunk < 40);
    assert.equal(
      shrunk,
      40 * (8 / (8 + BAYESIAN_PRIOR_STRENGTH)),
    );
  });

  it("returns raw delta once the reliability floor is met", () => {
    const display = displayWinRateDelta(24.5, RELIABILITY_FLOOR_GAMES);
    assert.equal(display.rawDelta, 24.5);
    assert.equal(display.displayDelta, 24.5);
    assert.equal(display.isPreliminary, false);
    assert.equal(display.isAdjusted, false);
  });

  it("returns shrunk delta for preliminary samples", () => {
    const display = displayWinRateDelta(30, 10);
    assert.equal(display.isPreliminary, true);
    assert.equal(display.isAdjusted, true);
    assert.ok(Math.abs(display.displayDelta) < Math.abs(display.rawDelta));
  });

  it("computes maturity percent from sample size", () => {
    assert.equal(dataMaturityPercent(0), 0);
    assert.equal(dataMaturityPercent(6), 30);
    assert.equal(dataMaturityPercent(10), 50);
    assert.equal(dataMaturityPercent(20), 100);
    assert.equal(dataMaturityPercent(40), 100);
  });

  it("formats adjusted delta tooltip copy", () => {
    assert.equal(
      adjustedDeltaTooltipText(14.2),
      "Adjusted for small sample: +14.2pp",
    );
    assert.equal(
      adjustedDeltaTooltipText(-3.5),
      "Adjusted for small sample: -3.5pp",
    );
  });

  it("maps matrix sample counts to confidence pill tiers", () => {
    assert.equal(matrixSampleConfidenceTier(12), "high");
    assert.equal(matrixSampleConfidenceLabel("high"), "10+ games");
    assert.equal(matrixSampleConfidenceTier(7), "moderate");
    assert.equal(matrixSampleConfidenceLabel("moderate"), "5-9 games");
    assert.equal(matrixSampleConfidenceTier(3), "low");
    assert.equal(matrixSampleConfidenceLabel("low"), "<5 games");
  });

  it("exposes standout split footnote without em dashes", () => {
    assert.match(STANDOUT_SPLIT_FOOTNOTE, /sample sizes < 20 games/);
    assert.doesNotMatch(STANDOUT_SPLIT_FOOTNOTE, /\u2014/);
  });

  it("maps maturity scores to tier bands", () => {
    assert.equal(dataMaturityTier(10), "Low Maturity");
    assert.equal(dataMaturityTier(29), "Low Maturity");
    assert.equal(dataMaturityTier(30), "Moderate Maturity");
    assert.equal(dataMaturityTier(59), "Moderate Maturity");
    assert.equal(dataMaturityTier(60), "High Maturity");
    assert.equal(dataMaturityTier(95), "High Maturity");
  });

  it("increases maturity score with sample depth", () => {
    const thin = dataMaturityScore(8, 20);
    const moderate = dataMaturityScore(40, 20);
    const strong = dataMaturityScore(120, 20);
    assert.ok(thin < moderate);
    assert.ok(moderate < strong);
    assert.ok(thin >= 5 && strong <= 100);
  });

  it("formats sample size and delta labels", () => {
    assert.equal(formatSampleSizeLabel(1), "1 game");
    assert.equal(formatSampleSizeLabel(8), "8 games");
    assert.equal(formatDeltaPp(12.3), "+12.3pp");
    assert.equal(formatDeltaPp(-4.5), "-4.5pp");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  heroToneFromWinRateDelta,
  heroToneFromWhistlePct,
  inferSignificantKpiTone,
  isSignificantDeviation,
  overRateHeroTone,
  populationStdDev,
  statValueSignificanceTone,
  twoProportionZTest,
  WIN_RATE_SIGNIFICANT_PP,
} from "./metric-significance";

describe("metric-significance", () => {
  it("flags deviation at or above one population std dev", () => {
    const values = [0.48, 0.5, 0.52, 0.49, 0.51];
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const stdDev = populationStdDev(values);
    assert.ok(stdDev > 0);
    assert.equal(isSignificantDeviation(mean + stdDev, mean, stdDev), true);
    assert.equal(isSignificantDeviation(mean + stdDev * 0.5, mean, stdDev), false);
  });

  it("keeps small win-rate deltas neutral for hero tone", () => {
    assert.equal(heroToneFromWinRateDelta(5), "neutral");
    assert.equal(heroToneFromWinRateDelta(WIN_RATE_SIGNIFICANT_PP), "positive");
    assert.equal(heroToneFromWinRateDelta(-WIN_RATE_SIGNIFICANT_PP), "negative");
  });

  it("requires whistle pct clearance before highlighting", () => {
    assert.equal(heroToneFromWhistlePct(6), "neutral");
    assert.equal(heroToneFromWhistlePct(10), "positive");
    assert.equal(heroToneFromWhistlePct(-11), "negative");
  });

  it("does not color mildly positive KPI strings", () => {
    assert.equal(inferSignificantKpiTone("+3.2"), "neutral");
    assert.equal(inferSignificantKpiTone("+14.0pp"), "positive");
    assert.equal(inferSignificantKpiTone("-9.5%"), "negative");
    assert.equal(inferSignificantKpiTone("+4.0%"), "neutral");
  });

  it("uses std dev for over-rate spotlight tone", () => {
    const mean = 0.5;
    const stdDev = 0.04;
    assert.equal(overRateHeroTone(0.53, mean, stdDev), "neutral");
    assert.equal(overRateHeroTone(0.55, mean, stdDev), "positive");
    assert.equal(overRateHeroTone(0.45, mean, stdDev), "negative");
  });

  it("maps stat strings to delight tones only when significant", () => {
    assert.equal(statValueSignificanceTone("+2.1"), "neutral");
    assert.equal(statValueSignificanceTone("+12.5"), "standout-high");
    assert.equal(statValueSignificanceTone("-18.0pp"), "standout-low");
    assert.equal(statValueSignificanceTone("62.8%"), "neutral");
  });

  it("twoProportionZTest rejects thin ref samples and zero-variance pools", () => {
    assert.equal(twoProportionZTest(12, 12, 10, 12).significantAt05, false);
    assert.equal(twoProportionZTest(7, 7, 3, 10).significantAt05, false);
    assert.equal(twoProportionZTest(0, 0, 10, 20).significantAt05, false);
    assert.equal(twoProportionZTest(10, 10, 10, 10).significantAt05, false);
  });

  it("twoProportionZTest flags large-sample moderate deltas", () => {
    const result = twoProportionZTest(65, 100, 500, 1000);
    assert.ok(result.significantAt05);
    assert.ok(result.pValue < 0.05);
    assert.ok(Math.abs(result.z) > 1.96);
  });

  it("twoProportionZTest flags thick ref×team splits against team baseline", () => {
    const result = twoProportionZTest(17, 19, 363, 820);
    assert.ok(result.significantAt05);
    assert.ok(result.pValue < 0.05);
  });

  it("twoProportionZTest stays conservative when baseline sample is thin", () => {
    const result = twoProportionZTest(15, 19, 8, 15);
    assert.equal(result.significantAt05, false);
    assert.ok(result.pValue >= 0.05);
  });
});

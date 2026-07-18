import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GSNI_LEAGUE_PRIOR,
  GSNI_SHRINKAGE_PRIOR_HL_MINUTES,
  bayesianShrinkLambda,
  bayesianShrinkTowardPrior,
  isShrinkageMaterial,
  shrinkGsni,
  shrinkPenaltyDelta,
  shrinkageSampleN,
  shrunkMetricTooltip,
} from "@/lib/bayesian-shrinkage";

describe("bayesian-shrinkage", () => {
  it("computes lambda from high-leverage minutes", () => {
    assert.equal(bayesianShrinkLambda(0, 50), 0);
    assert.equal(bayesianShrinkLambda(25, 50), 0.3333333333333333);
    assert.equal(bayesianShrinkLambda(50, 50), 0.5);
    assert.equal(bayesianShrinkLambda(100, 50), 2 / 3);
  });

  it("shrinks extreme GSNI toward the league prior for low N", () => {
    const metric = shrinkGsni(18, 12);
    assert.equal(metric.observed, 18);
    assert.equal(metric.prior, GSNI_LEAGUE_PRIOR);
    assert.ok(metric.shrunk > metric.observed);
    assert.ok(metric.shrunk < GSNI_LEAGUE_PRIOR);
    assert.equal(
      metric.shrunk,
      bayesianShrinkTowardPrior(
        18,
        GSNI_LEAGUE_PRIOR,
        12,
        GSNI_SHRINKAGE_PRIOR_HL_MINUTES,
      ).shrunk,
    );
  });

  it("approaches observed GSNI as high-leverage minutes increase", () => {
    const low = shrinkGsni(82, 20);
    const high = shrinkGsni(82, 180);
    assert.ok(Math.abs(high.shrunk - 82) < Math.abs(low.shrunk - 82));
  });

  it("shrinks penalty deltas toward zero", () => {
    const metric = shrinkPenaltyDelta(14.5, 18);
    assert.ok(Math.abs(metric.shrunk) < Math.abs(metric.observed));
    assert.equal(metric.prior, 0);
  });

  it("builds tooltip copy with observed and shrunk values", () => {
    const metric = shrinkGsni(72, 40);
    const tooltip = shrunkMetricTooltip(metric, { label: "GSNI", unit: "GSNI" });
    assert.match(tooltip, /Observed gsni: 72/i);
    assert.match(tooltip, /Weight λ=/);
  });

  it("flags material shrinkage when observed and shrunk diverge", () => {
    assert.equal(isShrinkageMaterial(shrinkGsni(20, 10)), true);
    assert.equal(isShrinkageMaterial(shrinkGsni(50, 200)), false);
  });

  it("falls back to game count when HL minutes are unavailable", () => {
    assert.equal(shrinkageSampleN(undefined, 72), 72);
    assert.equal(shrinkageSampleN(0, 72), 72);
    assert.equal(shrinkageSampleN(40, 72), 40);
  });
});

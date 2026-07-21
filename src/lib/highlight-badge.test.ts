import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createHighlightBadgeRegistry,
  meetsOverRateHighlightThreshold,
  meetsOverRateTopTierThreshold,
  meetsScoringHighlightThreshold,
  meetsWhistleHighlightThreshold,
  meetsWhistleTopTierThreshold,
} from "@/lib/highlight-badge";

describe("highlight-badge materiality gates", () => {
  it("requires at least 0.5 scoring delta for highlights", () => {
    assert.equal(meetsScoringHighlightThreshold(0.49), false);
    assert.equal(meetsScoringHighlightThreshold(0.5), true);
    assert.equal(meetsScoringHighlightThreshold(-0.2), false);
  });

  it("requires at least 5 percentage points from neutral over rate", () => {
    assert.equal(meetsOverRateHighlightThreshold(0.54), false);
    assert.equal(meetsOverRateHighlightThreshold(0.56), true);
    assert.equal(meetsOverRateHighlightThreshold(0.44), true);
  });

  it("requires at least 1.5 whistle delta for NBA", () => {
    assert.equal(meetsWhistleHighlightThreshold(1.4, "nba"), false);
    assert.equal(meetsWhistleHighlightThreshold(1.5, "nba"), true);
  });

  it("requires 8 percentage points from neutral over rate for primary over badges", () => {
    assert.equal(meetsOverRateTopTierThreshold(0.57), false);
    assert.equal(meetsOverRateTopTierThreshold(0.59), true);
    assert.equal(meetsOverRateTopTierThreshold(0.41), true);
  });

  it("requires 2.5 whistle delta for primary NBA whistle badges", () => {
    assert.equal(meetsWhistleTopTierThreshold(2.4, "nba"), false);
    assert.equal(meetsWhistleTopTierThreshold(2.5, "nba"), true);
  });
});

describe("highlight-badge registry deduplication", () => {
  it("downgrades modest over-rate deltas to secondary labels", () => {
    const registry = createHighlightBadgeRegistry();
    const badge = registry.overRateBadge(0.56);
    assert.match(badge?.label ?? "", /Notable over-rate vs baseline/i);
    assert.doesNotMatch(badge?.label ?? "", /Highest/i);
  });

  it("assigns only one primary over-rate high label per grid", () => {
    const registry = createHighlightBadgeRegistry();
    const first = registry.overRateBadge(0.62);
    const second = registry.overRateBadge(0.59);
    assert.match(first?.label ?? "", /Highest historical over-rate/i);
    assert.match(second?.label ?? "", /Notable over-rate/i);
    assert.doesNotMatch(second?.label ?? "", /Highest/i);
  });

  it("downgrades sub-top-tier whistle deltas to secondary labels", () => {
    const registry = createHighlightBadgeRegistry();
    const badge = registry.whistleBadge(1.8, "Foul", "nba");
    assert.match(badge?.label ?? "", /Notable heavy foul pace/i);
    assert.doesNotMatch(badge?.label ?? "", /Heaviest/i);
  });

  it("assigns only one primary heaviest whistle label per grid", () => {
    const registry = createHighlightBadgeRegistry();
    const first = registry.whistleBadge(3.1, "Foul", "nba");
    const second = registry.whistleBadge(2.8, "Foul", "nba");
    assert.match(first?.label ?? "", /Heaviest foul ref/i);
    assert.match(second?.label ?? "", /Notable heavy foul pace/i);
    assert.doesNotMatch(second?.label ?? "", /Heaviest/i);
  });

  it("assigns only one primary ATS label per grid", () => {
    const registry = createHighlightBadgeRegistry();
    const first = registry.atsBadge();
    const second = registry.atsBadge();
    assert.match(first.label, /Strongest home ATS track record/i);
    assert.match(second.label, /Notable home ATS track record/i);
  });

  it("assigns only one primary O/U betting label per grid", () => {
    const registry = createHighlightBadgeRegistry();
    const first = registry.ouBettingBadge();
    const second = registry.ouBettingBadge();
    assert.match(first.label, /Highest O\/U hit rate vs closing total/i);
    assert.match(second.label, /Notable O\/U hit rate vs closing total/i);
  });

  it("assigns only one primary Biggest scoring dip per grid", () => {
    const registry = createHighlightBadgeRegistry();
    const first = registry.scoringBadge(-1.2);
    const second = registry.scoringBadge(-0.9);
    assert.match(first?.label ?? "", /Biggest scoring dip/i);
    assert.match(second?.label ?? "", /Notable scoring dip/i);
    assert.doesNotMatch(second?.label ?? "", /Biggest/i);
  });

  it("downgrades sub-1.0 scoring deltas to secondary labels", () => {
    const registry = createHighlightBadgeRegistry();
    const badge = registry.scoringBadge(-0.6);
    assert.match(badge?.label ?? "", /Notable scoring dip/i);
    assert.doesNotMatch(badge?.label ?? "", /Biggest/i);
  });

  it("uses elevated label for third scoring dip in the same grid", () => {
    const registry = createHighlightBadgeRegistry();
    registry.scoringBadge(-1.4);
    registry.scoringBadge(-1.1);
    const third = registry.scoringBadge(-0.8);
    assert.match(third?.label ?? "", /Elevated scoring dip/i);
  });
});

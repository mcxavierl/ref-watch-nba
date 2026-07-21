import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createHighlightBadgeRegistry,
  meetsOverRateHighlightThreshold,
  meetsScoringHighlightThreshold,
  meetsWhistleHighlightThreshold,
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
});

describe("highlight-badge registry deduplication", () => {
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

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeWhistleIndex,
  computeWhistleIndexFromPctDelta,
  isExtremeWhistleIndex,
  whistleIndexBand,
  whistleIndexFromCrewMetrics,
  whistleIndexFromInsightCard,
  whistleIndexVisualTone,
} from "@/lib/whistle-index";
import type { LeagueInsightCard } from "@/lib/league-overview-insights";

describe("whistle index", () => {
  it("maps league average to 50", () => {
    assert.equal(computeWhistleIndex(10, 10), 50);
    assert.equal(computeWhistleIndexFromPctDelta(0), 50);
  });

  it("maps extreme deltas toward 0 and 100", () => {
    assert.equal(computeWhistleIndexFromPctDelta(-40), 0);
    assert.equal(computeWhistleIndexFromPctDelta(40), 100);
    assert.equal(computeWhistleIndex(14, 10), 100);
    assert.equal(computeWhistleIndex(6, 10), 0);
  });

  it("flags extreme bands", () => {
    assert.equal(isExtremeWhistleIndex(82), true);
    assert.equal(isExtremeWhistleIndex(18), true);
    assert.equal(isExtremeWhistleIndex(55), false);
    assert.equal(whistleIndexBand(85), "high");
    assert.equal(whistleIndexBand(12), "low");
    assert.equal(whistleIndexBand(50), "neutral");
  });

  it("derives crew and insight card indices", () => {
    const crewIndex = whistleIndexFromCrewMetrics({
      avgFouls: 12,
      foulsDelta: 2,
    });
    assert.equal(crewIndex, 75);

    const card: LeagueInsightCard = {
      leagueId: "nfl",
      label: "NFL",
      shortLabel: "NFL",
      kind: "ref-outlier",
      kicker: "Whistle outlier",
      headline: "Sample",
      story: "Sample story",
      heroValue: "+18.2%",
      heroLabel: "Flags variance vs league",
      heroTone: "positive",
      stats: [],
      links: [],
    };
    assert.ok((whistleIndexFromInsightCard(card) ?? 0) > 70);
  });

  it("maps visual tone around the league-average band", () => {
    assert.equal(whistleIndexVisualTone(54), "neutral");
    assert.equal(whistleIndexVisualTone(45), "neutral");
    assert.equal(whistleIndexVisualTone(55), "neutral");
    assert.equal(whistleIndexVisualTone(30), "low");
    assert.equal(whistleIndexVisualTone(72), "high");
  });
});

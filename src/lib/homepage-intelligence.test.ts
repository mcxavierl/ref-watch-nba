import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import {
  buildDailyIntelligenceBriefing,
  buildHomepageProofMetrics,
  buildIntelligenceHeroView,
  buildTopSignalView,
  selectTopSignalInsight,
} from "@/lib/homepage-intelligence";

describe("homepage-intelligence", () => {
  it("builds proof metrics from the bundled overview snapshot", () => {
    const data = loadOverviewSnapshot();
    const metrics = buildHomepageProofMetrics(data);
    assert.equal(metrics.length, 5);
    assert.match(metrics[0]?.label ?? "", /Officials Modeled/i);
    assert.match(metrics[4]?.value ?? "", /%/);
  });

  it("builds a daily briefing with top signal matchup", () => {
    const data = loadOverviewSnapshot();
    const briefing = buildDailyIntelligenceBriefing(data);
    assert.ok(briefing.gamesAnalyzed > 0);
    assert.ok(briefing.topSignalMatchup.length > 0);
  });

  it("builds intelligence hero view with stats, top signal, and proof metrics", () => {
    const data = loadOverviewSnapshot();
    const view = buildIntelligenceHeroView(data);
    assert.ok(view.gamesAnalyzed > 0);
    assert.ok(view.topMatchup.length > 0);
    assert.ok(view.topSignalConfidence > 0);
    assert.ok(view.modelCertaintyPct > 0);
    assert.equal(view.proofMetrics.length, 4);
    assert.match(view.proofMetrics[0]?.label ?? "", /OFFICIALS MODELED/i);
    assert.match(view.proofMetrics[1]?.value ?? "", /,/);
  });

  it("selects a featured top signal insight", () => {
    const data = loadOverviewSnapshot();
    const signal = selectTopSignalInsight(data);
    assert.ok(signal === null || signal.headline.length > 0);
  });

  it("builds top signal view with percentile and stat breakdown", () => {
    const data = loadOverviewSnapshot();
    const signal = buildTopSignalView(data);
    if (!signal) return;
    assert.match(signal.percentileLabel, /Percentile Signal/);
    assert.ok(signal.matchupTitle.length > 0);
    assert.match(signal.statBreakdown, /Game Sample/);
    assert.match(signal.statBreakdown, /Confidence/);
  });
});

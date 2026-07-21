import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import {
  buildDailyIntelligenceBriefing,
  buildHomepageProofMetrics,
  buildIntelligenceFeedEvents,
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

  it("builds intelligence feed events with categories", () => {
    const data = loadOverviewSnapshot();
    const events = buildIntelligenceFeedEvents(data, 8);
    assert.ok(events.length > 0);
    for (const event of events) {
      assert.ok(event.timeLabel.length > 0);
      assert.ok(event.message.length > 0);
      assert.ok(["anomalies", "assignments", "projections"].includes(event.category));
    }
  });

  it("builds intelligence feed events from slate and insights", () => {
    const data = loadOverviewSnapshot();
    const events = buildIntelligenceFeedEvents(data, 6);
    assert.ok(events.length > 0);
    assert.ok(events.some((event) => event.category === "projections" || event.category === "anomalies"));
  });
});

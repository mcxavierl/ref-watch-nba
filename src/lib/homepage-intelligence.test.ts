import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import {
  buildDailyIntelligenceBriefing,
  buildHomepageProofMetrics,
  buildIntelligenceFeedCards,
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

  it("builds intelligence feed without duplicating the featured signal", () => {
    const data = loadOverviewSnapshot();
    const featured = selectTopSignalInsight(data);
    const feed = buildIntelligenceFeedCards(data, 4);
    if (featured) {
      const featuredKey = `${featured.leagueId}:${featured.refSlug ?? featured.headline}:${featured.teamAbbr ?? ""}`;
      assert.ok(
        !feed.some(
          (card) =>
            `${card.leagueId}:${card.refSlug ?? card.headline}:${card.teamAbbr ?? ""}` ===
            featuredKey,
        ),
      );
    }
  });
});

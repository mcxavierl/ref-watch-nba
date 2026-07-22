import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadOverviewSnapshot } from "@/lib/overview-snapshot-data";
import {
  buildDatasetMoatMetrics,
  buildHomepageIntelligenceTickerItems,
  buildTodaysBiggestEdgeView,
  buildTopStatisticalSignalCards,
} from "@/lib/homepage-dual-narrative";

describe("homepage-dual-narrative", () => {
  it("builds today's biggest edge from the overview snapshot", () => {
    const data = loadOverviewSnapshot();
    const edge = buildTodaysBiggestEdgeView(data);
    if (!edge) return;
    assert.ok(edge.matchup.length > 0);
    assert.ok(edge.projectedFouls > 0);
    assert.ok(edge.confidencePct > 0);
    assert.equal(edge.evidenceBullets.length, 3);
  });

  it("builds dataset moat metrics with three infrastructure proof points", () => {
    const data = loadOverviewSnapshot();
    const metrics = buildDatasetMoatMetrics(data);
    assert.equal(metrics.length, 3);
    assert.match(metrics[0]?.label ?? "", /Games Indexed \(7 Leagues\)/i);
    assert.match(metrics[1]?.label ?? "", /Historical Decisions/i);
    assert.doesNotMatch(
      metrics.map((metric) => metric.label).join(" "),
      /Crew Combos Modeled/i,
    );
  });

  it("builds intelligence ticker and top statistical signal cards", () => {
    const data = loadOverviewSnapshot();
    const ticker = buildHomepageIntelligenceTickerItems(data);
    const signals = buildTopStatisticalSignalCards(data);
    assert.ok(Array.isArray(ticker));
    assert.ok(Array.isArray(signals));
  });
});

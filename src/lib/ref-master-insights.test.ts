import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRefMasterInsights } from "@/lib/ref-master-insights";
import type { RefStatsFile } from "@/lib/types";

const STATS: RefStatsFile = {
  meta: {
    lastUpdated: "2026-07-13",
    seasons: ["2024-25"],
    leagueAvgTotal: 220,
    leagueAvgFouls: 40,
    leagueOverBaseline: 220,
    minSampleSize: 30,
    source: "seeded",
    atsAvailable: true,
  },
  refs: [
    {
      slug: "test-official-42",
      name: "Test Official",
      number: 42,
      games: 100,
      avgTotalPoints: 220,
      overRate: 0.5,
      avgFouls: 40,
      homeCoverRate: null,
      totalPointsDelta: 0,
      foulsDelta: 0,
      seasons: ["2024-25"],
      recentGames: [],
    },
  ],
  teamSplits: {},
};

const PROFILE = STATS.refs[0];

describe("buildRefMasterInsights", () => {
  it("returns an empty array when metrics are hidden", () => {
    assert.deepEqual(buildRefMasterInsights("nba", PROFILE, STATS, false), []);
  });

  it("marks a sole insight as non-interactive", () => {
    const insights = buildRefMasterInsights("nba", PROFILE, STATS, true);
    if (insights.length === 1) {
      assert.equal(insights[0].interactive, false);
    }
  });

  it("emits JSON-serializable insight payloads", () => {
    const insights = buildRefMasterInsights("nba", PROFILE, STATS, true);
    const serialized = JSON.parse(JSON.stringify(insights)) as typeof insights;
    assert.equal(Array.isArray(serialized), true);
    for (const row of serialized) {
      assert.ok(typeof row.id === "string");
      assert.ok(typeof row.pillLabel === "string");
      assert.ok(Array.isArray(row.stats));
    }
  });
});

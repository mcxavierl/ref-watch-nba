import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aggregateBaselineForSeasons, getBaselinesFile } from "@/lib/baselines";
import { buildScopedRefStats } from "@/lib/scoped-ref-stats";
import { getRefStats as getNflStats } from "@/lib/nfl/data";
import type { RefStatsFile } from "@/lib/types";

function miniStats(seasons: string[]): RefStatsFile {
  return {
    refs: [
      {
        slug: "a-1",
        name: "A",
        number: 1,
        games: 40,
        avgTotalPoints: 230,
        overRate: 0.5,
        avgFouls: 40,
        homeCoverRate: null,
        totalPointsDelta: 5,
        foulsDelta: 1,
        seasons,
        recentGames: [],
      },
    ],
    teamSplits: {},
    meta: {
      seasons,
      leagueAvgTotal: 225,
      leagueAvgFouls: 38,
      leagueOverBaseline: 225,
      minSampleSize: 30,
      refCount: 1,
      lastUpdated: "2026-01-01",
      source: "hybrid",
      atsAvailable: true,
    },
  };
}

describe("aggregateBaselineForSeasons", () => {
  it("weights per-season baselines by game count", () => {
    const file = getBaselinesFile();
    const seasons = Object.keys(file.NBA.seasons).slice(0, 2);
    if (seasons.length < 2) return;

    const aggregate = aggregateBaselineForSeasons("NBA", seasons);
    assert.ok(aggregate);
    assert.ok(aggregate.gameCount > 0);
    assert.ok(aggregate.leagueAvgTotal > 0);
  });
});

describe("buildScopedRefStats", () => {
  it("meta-only scope updates league baselines without requiring game logs", () => {
    const seasons = ["2023-24", "2024-25", "2025-26"];
    const base = miniStats(seasons);
    const scoped = buildScopedRefStats("nba", base, ["2024-25", "2025-26"], {
      depth: "meta-only",
    });

    assert.deepEqual(scoped.meta.seasons, ["2024-25", "2025-26"]);
    assert.equal(scoped.refs.length, 1);
    assert.ok(scoped.meta.leagueAvgTotal > 0);
  });

  it("meta-only NFL scope sets totalGamesProcessed from scoped game logs", () => {
    const scopedSeasons = [
      "2016-17",
      "2017-18",
      "2018-19",
      "2019-20",
      "2020-21",
      "2021-22",
      "2022-23",
      "2023-24",
      "2024-25",
      "2025-26",
    ];
    const full = getNflStats();
    const scoped = buildScopedRefStats("nfl", full, scopedSeasons, {
      depth: "meta-only",
    });

    assert.equal(scoped.meta.seasons.length, 10);
    assert.equal(scoped.meta.totalGamesProcessed, 2757);
    assert.equal(full.meta.totalGamesProcessed, 2757);
  });

  it("returns base unchanged when scope matches full season list", () => {
    const seasons = ["2023-24", "2024-25"];
    const base = miniStats(seasons);
    const scoped = buildScopedRefStats("nba", base, seasons, { depth: "full" });
    assert.equal(scoped, base);
  });
});

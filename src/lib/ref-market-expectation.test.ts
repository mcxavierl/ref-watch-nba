import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  setCachedGameLogs,
} from "@/lib/game-logs-preload";
import {
  beginWorkerIsolateRequest,
  endWorkerIsolateRequest,
  getWorkerIsolateStore,
} from "@/lib/worker-isolate-store";
import {
  ATS_OUTLIER_DEVIATION_THRESHOLD,
  enrichRefStatsForMarketExpectation,
  scanAtsOutlierRefs,
} from "@/lib/ref-market-expectation";
import {
  isTeamMarketUnderdog,
  phiUnderdogCoverCorrelation,
  teamAtsResult,
} from "@/lib/team-ats";
import type { RefStatsFile } from "@/lib/types";

const baseStats: RefStatsFile = {
  meta: {
    lastUpdated: "2026-01-01",
    seasons: ["2024-25"],
    leagueAvgTotal: 220,
    leagueAvgFouls: 20,
    leagueOverBaseline: 220,
    minSampleSize: 30,
    source: "seeded",
    data_verified: true,
    data_source: "test",
    atsAvailable: true,
    refCount: 1,
    totalGamesProcessed: 1,
    dateRange: { earliest: "2024-01-01", latest: "2024-01-02" },
  },
  refs: [
    {
      slug: "scott-foster-48",
      name: "Scott Foster",
      number: 48,
      games: 20,
      avgTotalPoints: 220,
      overRate: 0.5,
      avgFouls: 20,
      homeCoverRate: null,
      totalPointsDelta: 0,
      foulsDelta: 0,
      seasons: ["2024-25"],
      recentGames: [],
      teamStats: {
        LAL: { games: 10, avgFoulDifferential: 0, avgTotalPoints: 220, overRate: 0.5, winRate: 0.3 },
      },
    },
  ],
  teamSplits: {},
};

describe("team market underdog helpers", () => {
  it("flags home underdog on positive spread", () => {
    assert.equal(isTeamMarketUnderdog(true, 4.5), true);
    assert.equal(isTeamMarketUnderdog(false, -3.5), true);
    assert.equal(isTeamMarketUnderdog(true, -3.5), false);
  });

  it("computes phi correlation for underdog vs cover", () => {
    const phi = phiUnderdogCoverCorrelation([
      { underdog: true, covered: true },
      { underdog: true, covered: true },
      { underdog: true, covered: false },
      { underdog: false, covered: false },
      { underdog: false, covered: true },
      { underdog: false, covered: true },
      { underdog: false, covered: false },
      { underdog: false, covered: false },
    ]);
    assert.ok(phi !== null && phi > 0);
  });
});

describe("ref market expectation enrichment", () => {
  it("flags ATS outliers when deviation exceeds threshold", () => {
    beginWorkerIsolateRequest();

    const logs = {
      lastUpdated: "2026-01-01",
      league: "NBA" as const,
      source: "test",
      games: Array.from({ length: 14 }, (_, index) => {
        const homeWin = index < 4;
        return {
          gameId: `g-${index}`,
          date: "2024-01-01",
          season: "2024-25",
          league: "NBA" as const,
          homeTeam: "LAL",
          awayTeam: "BOS",
          homeScore: homeWin ? 110 : 100,
          awayScore: homeWin ? 100 : 110,
          totalPoints: 210,
          totalFouls: 40,
          closingTotal: 220,
          homeSpread: 5,
          lineSource: "external" as const,
          officials: [{ name: "Scott Foster", number: 48, role: "referee" as const }],
        };
      }),
    };

    setCachedGameLogs("NBA", logs);

    const enriched = enrichRefStatsForMarketExpectation(
      "nba",
      baseStats,
      ["2024-25"],
    );

    const ref = enriched.refs[0];
    assert.ok(ref.marketExpectation);
    assert.equal(ref.marketExpectation?.linedGames, 14);
    assert.ok(
      Math.abs(ref.marketExpectation!.deviationFromNeutral) >=
        ATS_OUTLIER_DEVIATION_THRESHOLD,
    );
    assert.equal(ref.marketExpectation?.isAtsOutlier, true);
    assert.equal(scanAtsOutlierRefs(enriched).length, 1);

    const lal = ref.teamStats?.LAL;
    assert.ok(lal?.underdogAtsGames && lal.underdogAtsGames > 0);
    assert.equal(
      teamAtsResult(true, 110, 100, 5, true),
      "win",
    );

    getWorkerIsolateStore().marketExpectationEnrich.clear();
    endWorkerIsolateRequest();
  });
});

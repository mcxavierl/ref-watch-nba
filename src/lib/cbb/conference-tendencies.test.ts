import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCbbConferenceTendenciesStats } from "@/lib/cbb/conference-tendencies";
import {
  clearRuntimeGameLogsModuleCache,
  loadRuntimeGameLogs,
} from "@/lib/game-logs";
import {
  setCachedGameLogs,
  type RuntimeGameLogFile,
} from "@/lib/game-logs-preload";
import {
  beginWorkerIsolateRequest,
  endWorkerIsolateRequest,
} from "@/lib/worker-isolate-store";
import type { RefStatsFile } from "@/lib/types";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";

function miniStats(): RefStatsFile {
  return {
    refs: [
      {
        slug: "sample-ref-11",
        name: "Sample Ref",
        number: 11,
        games: 3,
        avgTotalPoints: 140,
        overRate: 0.5,
        avgFouls: 34,
        homeCoverRate: null,
        totalPointsDelta: 0,
        foulsDelta: 0,
        seasons: ["2023-24", "2024-25"],
        recentGames: [],
      },
    ],
    teamSplits: {},
    meta: {
      seasons: ["2023-24", "2024-25"],
      leagueAvgTotal: 140,
      leagueAvgFouls: 34,
      leagueOverBaseline: 140,
      minSampleSize: 1,
      refCount: 1,
      lastUpdated: "2026-01-01",
      source: "hybrid",
      atsAvailable: true,
    },
  };
}

function cbbGame(
  season: string,
  home: string,
  away: string,
  totalPoints: number,
  totalFouls: number,
): RuntimeGameLogEntry {
  return {
    gameId: `${season}-${home}-${away}`,
    date: "2024-01-10",
    season,
    league: "CBB",
    homeTeam: home,
    awayTeam: away,
    homeScore: totalPoints / 2,
    awayScore: totalPoints / 2,
    totalPoints,
    totalFouls,
    closingTotal: totalPoints + 2,
    homeSpread: -2,
    lineSource: "external",
    officials: [{ name: "Sample Ref", number: 11, role: "referee" }],
  };
}

describe("cbb conference tendencies", () => {
  it("returns base stats unchanged for all-conference scope", () => {
    const base = miniStats();
    const scoped = buildCbbConferenceTendenciesStats(base, ["2023-24"], "all");
    assert.equal(scoped, base);
  });

  it("rebuilds ref counts from conference-filtered game logs", () => {
    endWorkerIsolateRequest();
    beginWorkerIsolateRequest();
    clearRuntimeGameLogsModuleCache();

    const games = [
      cbbGame("2023-24", "DUKE", "UNC", 140, 34),
      cbbGame("2023-24", "DUKE", "UVA", 132, 30),
      cbbGame("2023-24", "ALA", "AUB", 150, 42),
    ];

    const logs: RuntimeGameLogFile = {
      lastUpdated: "2026-01-01",
      league: "CBB",
      source: "test",
      games,
    };
    setCachedGameLogs("CBB", logs);
    assert.equal(loadRuntimeGameLogs("CBB")?.games.length, 3);

    const base = miniStats();
    const accScoped = buildCbbConferenceTendenciesStats(
      base,
      ["2023-24"],
      "ACC",
    );
    assert.equal(accScoped.refs.length, 1);
    assert.equal(accScoped.refs[0]?.games, 2);
    assert.equal(accScoped.meta.totalGamesProcessed, 2);

    const secScoped = buildCbbConferenceTendenciesStats(
      base,
      ["2023-24"],
      "SEC",
    );
    assert.equal(secScoped.refs.length, 1);
    assert.equal(secScoped.refs[0]?.games, 1);
    assert.equal(secScoped.meta.totalGamesProcessed, 1);
  });
});

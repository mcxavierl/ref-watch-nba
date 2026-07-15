import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeFrictionMatrix,
  FRICTION_MIN_H2H_GAMES,
  frictionMinHeadToHeadGames,
  getFrictionMatrixDataset,
  isFrictionMatrixLeague,
} from "@/lib/friction-matrix";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { RefStatsFile } from "@/lib/types";
import { getWorkerIsolateStore } from "@/lib/worker-isolate-store";

const REF = { name: "Test Official", number: 42, role: "referee" as const };

function game(index: number, home: string, away: string, season: string) {
  return {
    gameId: `g-${index}`,
    date: "2024-11-01",
    season,
    league: "NBA" as const,
    homeTeam: home,
    awayTeam: away,
    homeScore: 110,
    awayScore: 105,
    totalPoints: 215,
    totalFouls: 44,
    closingTotal: 220,
    homeSpread: -3,
    lineSource: "external" as const,
    officials: [REF],
  } satisfies RuntimeGameLogEntry;
}

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

describe("friction-matrix", () => {
  it("flags NBA, NFL, and NHL as friction matrix leagues", () => {
    assert.equal(isFrictionMatrixLeague("nba"), true);
    assert.equal(isFrictionMatrixLeague("nfl"), true);
    assert.equal(isFrictionMatrixLeague("nhl"), true);
    assert.equal(isFrictionMatrixLeague("epl"), false);
  });

  it("requires minimum head-to-head games before surfacing friction cards", () => {
    getWorkerIsolateStore().matrixCompute.clear();
    const games = Array.from({ length: FRICTION_MIN_H2H_GAMES - 1 }, (_, i) =>
      game(i, "MIA", "BOS", "2024-25"),
    );
    const findings = computeFrictionMatrix("nba", STATS, games);
    assert.equal(findings.length, 0);
  });

  it("returns coach friction when enough MIA games exist", () => {
    getWorkerIsolateStore().matrixCompute.clear();
    const games = Array.from({ length: FRICTION_MIN_H2H_GAMES }, (_, i) => ({
      ...game(i, "MIA", "BOS", "2024-25"),
      homeFouls: 26,
      awayFouls: 12,
      totalFouls: 38,
    }));
    const findings = computeFrictionMatrix("nba", STATS, games);
    assert.ok(findings.length > 0);
    assert.ok(findings.some((row) => row.personnelType === "coach"));
    assert.ok(findings.every((row) => row.games >= FRICTION_MIN_H2H_GAMES));
  });

  it("serializes an RSC-safe dataset grouped by official", () => {
    getWorkerIsolateStore().matrixCompute.clear();
    const games = Array.from({ length: FRICTION_MIN_H2H_GAMES }, (_, i) => ({
      ...game(i, "MIA", "BOS", "2024-25"),
      homeFouls: 26,
      awayFouls: 12,
      totalFouls: 38,
    }));
    const dataset = getFrictionMatrixDataset("nba", STATS, games);
    assert.equal(dataset.version, 1);
    assert.equal(dataset.minHeadToHeadGames, FRICTION_MIN_H2H_GAMES);
    assert.equal(dataset.leagueId, "nba");
    assert.ok(Array.isArray(dataset.officials));
    assert.ok(Array.isArray(dataset.highImpactOfficials));
    assert.equal(
      JSON.parse(JSON.stringify(dataset)).findings.length,
      dataset.findings.length,
    );
  });

  it("uses penalty flags for NFL coach friction proxy", () => {
    getWorkerIsolateStore().matrixCompute.clear();
    const nflStats: RefStatsFile = {
      ...STATS,
      refs: [{ ...STATS.refs[0]!, slug: "test-official-42", name: "Test Official" }],
    };
    const nflGames = Array.from({ length: FRICTION_MIN_H2H_GAMES }, (_, i) => ({
      gameId: `nfl-${i}`,
      date: "2024-11-01",
      season: "2024-25",
      league: "NFL" as const,
      homeTeam: "KC",
      awayTeam: "BUF",
      homeScore: 24,
      awayScore: 20,
      totalPoints: 44,
      totalFouls: 14,
      homeFlags: 9,
      awayFlags: 5,
      closingTotal: 47,
      homeSpread: -3,
      lineSource: "external" as const,
      officials: [REF],
    }));
    const findings = computeFrictionMatrix("nfl", nflStats, nflGames);
    assert.ok(
      findings.every(
        (row) => row.games >= frictionMinHeadToHeadGames("nfl"),
      ),
    );
  });
});

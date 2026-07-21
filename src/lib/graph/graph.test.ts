import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crewKey } from "@/lib/data";
import { clearGraphQueryCache } from "@/lib/graph/cache";
import { buildLeagueKnowledgeGraph } from "@/lib/graph/index";
import {
  queryCrewTeamImpact,
  queryOfficialFriction,
  queryPaceMatrix,
} from "@/lib/graph/queryEngine";
import { venueIdForHomeTeam } from "@/lib/graph/schema";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import { refSlug } from "@/lib/ref-slug";

function official(name: string, number: number) {
  return { name, number, role: "referee" as const };
}

function game(overrides: Partial<RuntimeGameLogEntry> = {}): RuntimeGameLogEntry {
  return {
    gameId: overrides.gameId ?? "g1",
    date: overrides.date ?? "2026-01-10",
    season: overrides.season ?? "2025-26",
    league: "NBA",
    homeTeam: overrides.homeTeam ?? "BOS",
    awayTeam: overrides.awayTeam ?? "NYK",
    homeScore: overrides.homeScore ?? 110,
    awayScore: overrides.awayScore ?? 102,
    totalPoints: overrides.totalPoints ?? 212,
    totalFouls: overrides.totalFouls ?? 44,
    closingTotal: 220,
    homeSpread: -4,
    lineSource: "synthetic",
    officials: overrides.officials ?? [
      official("Scott Foster", 48),
      official("Tony Brothers", 25),
      official("Ed Malloy", 14),
    ],
    ...overrides,
  };
}

const CREW = crewKey([
  official("Scott Foster", 48),
  official("Tony Brothers", 25),
  official("Ed Malloy", 14),
]);

const REF_A = refSlug("Scott Foster", 48);
const REF_B = refSlug("Tony Brothers", 25);

const FIXTURE_GAMES: RuntimeGameLogEntry[] = [
  game({
    gameId: "g1",
    date: "2026-01-01",
    homeTeam: "BOS",
    awayTeam: "NYK",
    homeScore: 108,
    awayScore: 100,
    totalPoints: 208,
    totalFouls: 40,
  }),
  game({
    gameId: "g2",
    date: "2026-01-03",
    homeTeam: "BOS",
    awayTeam: "MIA",
    homeScore: 112,
    awayScore: 105,
    totalPoints: 217,
    totalFouls: 46,
    officials: [
      official("Scott Foster", 48),
      official("Tony Brothers", 25),
      official("Ed Malloy", 14),
    ],
  }),
  game({
    gameId: "g3",
    date: "2026-01-10",
    homeTeam: "BOS",
    awayTeam: "LAL",
    homeScore: 99,
    awayScore: 104,
    totalPoints: 203,
    totalFouls: 50,
    officials: [
      official("Scott Foster", 48),
      official("Tony Brothers", 25),
      official("Ed Malloy", 14),
    ],
    crewStoppages: [
      { kind: "technical", team: "LAL", gameSecondsElapsed: 1200, period: 2 },
    ],
  }),
];

describe("knowledge graph engine", () => {
  it("builds node and edge adjacency from game logs", () => {
    const graph = buildLeagueKnowledgeGraph("NBA", FIXTURE_GAMES, "test");
    assert.equal(graph.games.size, 3);
    assert.equal(graph.crews.size, 1);
    assert.ok(graph.officials.has(REF_A));
    assert.equal(graph.crewToGames.get(CREW)?.length, 3);

    const fosterCrews = graph.officialToCrews.get(REF_A);
    assert.equal(fosterCrews?.length, 1);
    assert.equal(fosterCrews?.[0]?.edge.type, "PART_OF_CREW");
    assert.equal(fosterCrews?.[0]?.edge.frequency, 1);
  });

  it("queryCrewTeamImpact traverses crew -> game -> team", () => {
    clearGraphQueryCache();
    const impact = queryCrewTeamImpact(CREW, "BOS", {
      leagueId: "nba",
      gameLogs: FIXTURE_GAMES,
      lastUpdated: "test",
    });

    assert.ok(impact);
    assert.equal(impact?.gamesSample, 3);
    assert.equal(impact?.teamId, "BOS");
    assert.ok(impact!.teamWinRate > 0);
    assert.ok(impact!.avgTotalPoints > 0);
  });

  it("queryPaceMatrix filters by venue proxy and rest days", () => {
    clearGraphQueryCache();
    const venueId = venueIdForHomeTeam("NBA", "BOS");
    const oneDayRest = queryPaceMatrix(REF_A, venueId, 2, {
      leagueId: "nba",
      gameLogs: FIXTURE_GAMES,
      lastUpdated: "test",
    });

    assert.ok(oneDayRest);
    assert.equal(oneDayRest?.gamesSample, 1);
    assert.equal(oneDayRest?.venueId, venueId);
    assert.equal(oneDayRest?.restDays, 2);
  });

  it("queryOfficialFriction aggregates shared-court foul variance", () => {
    clearGraphQueryCache();
    const friction = queryOfficialFriction(REF_A, REF_B, {
      leagueId: "nba",
      gameLogs: FIXTURE_GAMES,
      lastUpdated: "test",
    });

    assert.ok(friction);
    assert.equal(friction?.sharedGames, 3);
    assert.ok(friction!.foulVariance >= 0);
    assert.ok(friction!.avgFoulsCalled > 0);
  });

  it("caches repeated graph queries within TTL", () => {
    clearGraphQueryCache();
    const context = { leagueId: "nba" as const, gameLogs: FIXTURE_GAMES, lastUpdated: "test" };

    const first = queryCrewTeamImpact(CREW, "BOS", context);
    const second = queryCrewTeamImpact(CREW, "BOS", context);

    assert.deepEqual(first, second);
  });
});

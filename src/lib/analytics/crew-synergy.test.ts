import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateAdminRatioByCrewId,
  ARCHETYPE_VARIANCE_MISMATCHED_THRESHOLD,
  buildCrewIntelligenceEdgeNote,
  classifyCrewCohesion,
  computeArchetypeVariance,
  computeCrewSynergy,
  computeGameAdminRatio,
} from "@/lib/analytics/crew-synergy";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { RefProfile } from "@/lib/types";

function makeGame(
  overrides: Partial<RuntimeGameLogEntry> = {},
): RuntimeGameLogEntry {
  return {
    gameId: "nfl-test-1",
    date: "2025-09-07",
    season: "2025-26",
    league: "NFL",
    homeTeam: "KC",
    awayTeam: "BAL",
    homeScore: 27,
    awayScore: 20,
    totalPoints: 47,
    totalFouls: 0,
    homeFlags: 6,
    awayFlags: 8,
    subjectiveFlags: 10,
    administrativeFlags: 4,
    closingTotal: 47,
    homeSpread: -3,
    lineSource: "external",
    officials: [
      { name: "Adrian Hill", number: 29, role: "referee" },
      { name: "Brad Allen", number: 122, role: "umpire" },
      { name: "Carl Cheffers", number: 51, role: "side_judge" },
    ],
    ...overrides,
  };
}

function profileWithAdminRatio(
  slug: string,
  name: string,
  number: number,
  adminRatio: number,
): RefProfile {
  return {
    slug,
    name,
    number,
    games: 80,
    avgTotalPoints: 44,
    overRate: 0.5,
    avgFouls: 12,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2024-25"],
    recentGames: [],
    officialStats: {
      primary_archetype:
        adminRatio > 1.5
          ? "procedural-stickler"
          : adminRatio < 0.7
            ? "game-flow-manager"
            : "balanced",
      consistency_score: 7,
      admin_ratio: adminRatio,
      pressure_sensitive: false,
      pressure_delta_pct: null,
      sample_games: 80,
      last_calculated: "2026-07-20T00:00:00.000Z",
      leverage_index: null,
      leverage_profile: "neutral",
      early_period_foul_rate: null,
      high_pressure_foul_rate: null,
      leverage_sample_games: 0,
      close_game_sample: 0,
      split_backed_games: 0,
    },
  };
}

describe("crew-synergy", () => {
  it("computes game admin ratio from subjective and administrative flags", () => {
    const ratio = computeGameAdminRatio("nfl", makeGame());
    assert.equal(ratio, 0.4);
  });

  it("flags mismatched crews with high archetype variance", () => {
    const game = makeGame();
    const profiles = new Map<string, RefProfile>([
      ["adrian-hill-29", profileWithAdminRatio("adrian-hill-29", "Adrian Hill", 29, 0.2)],
      ["brad-allen-122", profileWithAdminRatio("brad-allen-122", "Brad Allen", 122, 1.9)],
      ["carl-cheffers-51", profileWithAdminRatio("carl-cheffers-51", "Carl Cheffers", 51, 0.5)],
    ]);

    const result = computeCrewSynergy({
      leagueId: "nfl",
      game,
      getProfile: (officialId) => profiles.get(officialId),
    });

    assert.ok(result);
    assert.ok(result!.archetypeVariance >= ARCHETYPE_VARIANCE_MISMATCHED_THRESHOLD);
    assert.equal(result!.crewCohesion, "mismatched");
    assert.equal(
      result!.edgeNote,
      "Warning: High archetype variance detected. Expect inconsistent whistle frequency.",
    );
    assert.equal(result!.members.length, 3);
  });

  it("classifies unified crews when member admin ratios cluster", () => {
    const game = makeGame();
    const profiles = new Map<string, RefProfile>([
      ["adrian-hill-29", profileWithAdminRatio("adrian-hill-29", "Adrian Hill", 29, 0.95)],
      ["brad-allen-122", profileWithAdminRatio("brad-allen-122", "Brad Allen", 122, 1.0)],
      ["carl-cheffers-51", profileWithAdminRatio("carl-cheffers-51", "Carl Cheffers", 51, 1.05)],
    ]);

    const result = computeCrewSynergy({
      leagueId: "nfl",
      game,
      getProfile: (officialId) => profiles.get(officialId),
    });

    assert.ok(result);
    assert.equal(result!.crewCohesion, "unified");
    assert.ok(result!.archetypeVariance <= 0.12);
  });

  it("aggregates admin ratio by crew_id", () => {
    const aggregate = aggregateAdminRatioByCrewId("a|b|c", 0.75);
    assert.deepEqual(aggregate, { crew_id: "a|b|c", admin_ratio: 0.75 });
  });

  it("computes archetype variance with population std dev", () => {
    assert.equal(computeArchetypeVariance([0.2, 1.9, 0.5]) > 0.7, true);
    assert.equal(computeArchetypeVariance([1, 1, 1]), 0);
  });

  it("builds edge note from cohesion class", () => {
    assert.match(
      buildCrewIntelligenceEdgeNote(0.5, classifyCrewCohesion(0.5)),
      /Warning: High archetype variance/,
    );
  });
});

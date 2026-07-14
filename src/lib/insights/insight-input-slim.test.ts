import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  stripRefProfileForInsights,
  type SlimRefProfile,
} from "./insight-input-slim";
import type { RefProfile } from "@/lib/types";

function sampleRef(overrides: Partial<RefProfile> = {}): RefProfile {
  return {
    slug: "sample-ref-42",
    name: "Sample Ref",
    number: 42,
    games: 120,
    avgTotalPoints: 220,
    overRate: 0.52,
    avgFouls: 41,
    homeCoverRate: 0.5,
    totalPointsDelta: 1.2,
    foulsDelta: 2.5,
    seasons: ["2024-25"],
    recentGames: [
      {
        gameId: "g1",
        date: "2025-01-01",
        season: "2024-25",
        homeTeam: "LAL",
        awayTeam: "BOS",
        totalPoints: 215,
        totalFouls: 40,
        overHit: true,
        raptorsInvolved: false,
      },
    ],
    teamStats: {
      LAL: {
        games: 10,
        winRate: 0.7,
        wins: 7,
        losses: 3,
        avgFoulDifferential: 1.2,
        overRate: 0.55,
        avgTotalPoints: 225,
      },
    },
    bettingStats: {
      homeTeamRecord: { wins: 1, losses: 0, pushes: 0 },
      homeTeamAts: { wins: 1, losses: 0, pushes: 0 },
      avgHomeScore: 110,
      avgRoadScore: 105,
      avgHomeMargin: 5,
      overUnder: { overall: { wins: 1, losses: 0, pushes: 0 }, buckets: [] },
      spreadBuckets: [],
      linesAvailable: true,
    },
    ...overrides,
  };
}

describe("stripRefProfileForInsights", () => {
  it("removes recentGames and bettingStats", () => {
    const slim = stripRefProfileForInsights(sampleRef());
    assert.equal("recentGames" in slim, false);
    assert.equal("bettingStats" in slim, false);
    assert.equal(slim.slug, "sample-ref-42");
    assert.equal(slim.games, 120);
    assert.ok(slim.teamStats?.LAL);
    assert.equal(slim.teamStats?.LAL?.games, 10);
    assert.equal(
      (slim.teamStats?.LAL as Record<string, unknown>).avgTotalPoints,
      225,
    );
  });

  it("preserves whistle fields needed for outlier cards", () => {
    const slim: SlimRefProfile = stripRefProfileForInsights(sampleRef());
    assert.equal(slim.avgFouls, 41);
    assert.equal(slim.foulsDelta, 2.5);
  });
});

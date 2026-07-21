import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRefIntelligenceProfile } from "@/lib/ref-intelligence-profile";
import type { RefProfile, RefStatsFile } from "@/lib/types";

function profile(overrides: Partial<RefProfile> = {}): RefProfile {
  return {
    slug: "scott-foster-48",
    name: "Scott Foster",
    number: 48,
    games: 120,
    avgTotalPoints: 224,
    overRate: 0.52,
    avgFouls: 44,
    homeCoverRate: 0.5,
    totalPointsDelta: 8.8,
    foulsDelta: 2.8,
    seasons: ["2023-24", "2024-25"],
    recentGames: [],
    teamStats: {
      BOS: {
        games: 12,
        avgFoulDifferential: 1.2,
        avgTotalPoints: 226,
        overRate: 0.58,
        winRate: 0.67,
        avgTechnicalFoulDifferential: -0.1,
      },
      LAL: {
        games: 10,
        avgFoulDifferential: -0.4,
        avgTotalPoints: 220,
        overRate: 0.42,
        winRate: 0.4,
      },
    },
    ...overrides,
  };
}

function stats(): RefStatsFile {
  return {
    meta: {
      lastUpdated: "2026-01-01",
      seasons: ["2023-24", "2024-25"],
      minSampleSize: 30,
      leagueOverBaseline: 220,
      source: "historical",
      atsAvailable: true,
    },
    refs: [],
    teamSplits: {},
    teamAtsBaselines: {},
  } as unknown as RefStatsFile;
}

describe("ref-intelligence-profile", () => {
  it("builds fingerprint badges with pace and foul deltas", () => {
    const bundle = buildRefIntelligenceProfile({
      leagueId: "nba",
      profile: profile(),
      stats: stats(),
      qualified: true,
      gameLogs: [],
    });

    assert.match(bundle.fingerprint.primaryStyle, /Flow Enabler|High Contact|Balanced/);
    assert.match(bundle.fingerprint.paceImpactLabel, /Possessions/);
    assert.match(bundle.fingerprint.foulsDeltaLabel, /\+2\.8 Fouls/);
    assert.ok(bundle.fingerprint.replayOverturnLabel.length > 0);
  });

  it("emits observed tendencies and team impact rows", () => {
    const bundle = buildRefIntelligenceProfile({
      leagueId: "nba",
      profile: profile(),
      stats: stats(),
      qualified: true,
      gameLogs: [],
    });

    assert.ok(bundle.tendencies.length >= 1);
    assert.equal(bundle.teamImpacts.length, 2);
    assert.equal(bundle.teamImpacts[0]?.abbr, "BOS");
  });
});

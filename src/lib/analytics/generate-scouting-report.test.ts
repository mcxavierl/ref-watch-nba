import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FOUL_CLASSIFICATION_MAP } from "@/config/penalty-types";
import {
  generateScoutingReport,
  type GameScoutingMetadata,
} from "@/lib/analytics/generate-scouting-report";
import type { RefProfile, RefStatsFile } from "@/lib/types";

function makeProfile(overrides: Partial<RefProfile> = {}): RefProfile {
  return {
    slug: "adrian-hill-29",
    name: "Adrian Hill",
    number: 29,
    games: 120,
    avgTotalPoints: 44,
    overRate: 0.52,
    avgFouls: 12,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2024-25"],
    recentGames: [],
    nflAnalytics: {
      avgFlagsPerGame: 12.8,
      flagsDelta: 0,
      avgPenaltyYardsPerGame: 95,
      penaltyYardsDelta: 0,
      avgFlagImbalance: 0.1,
      balancedGameRate: 0.5,
      balanceKind: "neutral",
      avgSubjectiveFlagsPerGame: 9.2,
      avgAdministrativeFlagsPerGame: 3.6,
      subjectiveFlagShare: 0.72,
      dispositionSampleGames: 120,
      dispositionEventBackedGames: 80,
    },
    ...overrides,
  };
}

function makeStats(): RefStatsFile {
  return {
    meta: {
      lastUpdated: "2026-07-20T00:00:00.000Z",
      seasons: ["2024-25"],
      leagueAvgTotal: 44,
      leagueAvgFouls: 12,
      leagueOverBaseline: 46,
      minSampleSize: 30,
      source: "seeded",
      atsAvailable: true,
    },
    refs: [],
    teamSplits: {},
  };
}

describe("generate-scouting-report", () => {
  it("exports FOUL_CLASSIFICATION_MAP taxonomy hooks", () => {
    assert.ok(FOUL_CLASSIFICATION_MAP.subjective.nfl.length > 0);
    assert.ok(FOUL_CLASSIFICATION_MAP.administrative.nfl.length > 0);
    assert.equal(FOUL_CLASSIFICATION_MAP.defaultSubjectiveShare.nfl, 0.58);
  });

  it("builds a predictive style profile from resolved official context", () => {
    const profile = makeProfile();
    const stats = makeStats();
    const metadata: GameScoutingMetadata = {
      leagueId: "nfl",
      isPrimetime: true,
    };

    const report = generateScoutingReport(
      profile.slug,
      metadata,
      { profile, stats, qualified: true },
    );

    assert.ok(report);
    assert.equal(report?.officialId, "adrian-hill-29");
    assert.ok(["game-flow", "rule-enforcer", "balanced"].includes(report!.styleProfile.archetype));
    assert.ok(["procedural-stickler", "game-flow-manager", "balanced"].includes(report!.archetype));
    assert.ok(report!.consistencyScore >= 1 && report!.consistencyScore <= 10);
    assert.ok(report!.archetypeBlurb.length > 0);
    assert.ok(report!.styleProfile.strictnessScore >= 0);
    assert.ok(report!.styleProfile.gameFlowScore >= 0);
    assert.match(report!.summary, /Official Adrian Hill/);
    assert.ok(report!.insights.length >= 2);
  });

  it("returns null when sample history is too thin and no analytics fallback exists", () => {
    const profile = makeProfile({
      slug: "missing-official-99",
      games: 1,
      nflAnalytics: undefined,
    });
    const stats = makeStats();

    const report = generateScoutingReport(
      profile.slug,
      { leagueId: "nba" },
      { profile, stats, qualified: false },
    );

    assert.equal(report, null);
  });
});

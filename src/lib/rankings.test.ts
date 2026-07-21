import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { qualifiesRefAnomaly } from "@/lib/anomaly-surface";
import { classifyRankingSignalPattern } from "@/lib/ranking-signal-pattern";
import {
  sortRefRankings,
  whistleDeltaForRanking,
} from "@/lib/rankings";
import type { RefProfile } from "@/lib/types";

function makeRef(overrides: Partial<RefProfile> = {}): RefProfile {
  return {
    slug: "test",
    name: "Test Ref",
    number: 1,
    games: 100,
    avgTotalPoints: 220,
    overRate: 0.5,
    avgFouls: 40,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2024"],
    recentGames: [],
    ...overrides,
  };
}

describe("sortRefRankings", () => {
  it("sorts games ascending from lowest to highest", () => {
    const refs = [
      makeRef({ slug: "high", name: "High", games: 120 }),
      makeRef({ slug: "low", name: "Low", games: 40 }),
      makeRef({ slug: "mid", name: "Mid", games: 80 }),
    ];

    const sorted = sortRefRankings(refs, "games-asc", "nba");
    assert.deepEqual(
      sorted.map((ref) => ref.slug),
      ["low", "mid", "high"],
    );
  });

  it("sorts games descending from highest to lowest", () => {
    const refs = [
      makeRef({ slug: "high", name: "High", games: 120 }),
      makeRef({ slug: "low", name: "Low", games: 40 }),
      makeRef({ slug: "mid", name: "Mid", games: 80 }),
    ];

    const sorted = sortRefRankings(refs, "games-desc", "nba");
    assert.deepEqual(
      sorted.map((ref) => ref.slug),
      ["high", "mid", "low"],
    );
  });

  it("uses NFL flags delta for whistle sorting", () => {
    const refs = [
      makeRef({
        slug: "a",
        name: "A",
        foulsDelta: 0.5,
        nflAnalytics: {
          avgFlagsPerGame: 10,
          flagsDelta: 3.2,
          avgPenaltyYardsPerGame: 80,
          penaltyYardsDelta: 5,
          avgFlagImbalance: 1,
          balancedGameRate: 0.5,
          balanceKind: "neutral",
        },
      }),
      makeRef({
        slug: "b",
        name: "B",
        foulsDelta: 2,
        nflAnalytics: {
          avgFlagsPerGame: 8,
          flagsDelta: 1.1,
          avgPenaltyYardsPerGame: 70,
          penaltyYardsDelta: 2,
          avgFlagImbalance: 1,
          balancedGameRate: 0.5,
          balanceKind: "neutral",
        },
      }),
    ];

    assert.equal(whistleDeltaForRanking(refs[0]!, "nfl"), 3.2);
    const sorted = sortRefRankings(refs, "whistle-desc", "nfl");
    assert.equal(sorted[0]?.slug, "a");
  });
});

describe("classifyRankingSignalPattern", () => {
  it("marks stable officials using qualifiesRefAnomaly", () => {
    const quiet = makeRef({ slug: "quiet", totalPointsDelta: 0.2, foulsDelta: 0.1 });
    assert.equal(classifyRankingSignalPattern(quiet, "nba", 0).label, "Stable");
    assert.equal(qualifiesRefAnomaly(quiet, "nba", 0), false);
  });

  it("marks anomaly officials when qualifiesRefAnomaly passes", () => {
    const hot = makeRef({ slug: "hot", totalPointsDelta: 4.2, foulsDelta: 0.5 });
    assert.equal(qualifiesRefAnomaly(hot, "nba", 0), true);
    assert.equal(classifyRankingSignalPattern(hot, "nba", 0).label, "Anomaly");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolvePenaltyShrinkageSampleN,
  shrinkNflAnalyticsDisplay,
} from "@/lib/nfl/penalty-shrinkage";
import type { NflRefAnalytics, RefProfile } from "@/lib/types";

function makeAnalytics(overrides: Partial<NflRefAnalytics> = {}): NflRefAnalytics {
  return {
    avgFlagsPerGame: 16,
    flagsDelta: 3,
    avgPenaltyYardsPerGame: 110,
    penaltyYardsDelta: 15,
    avgFlagImbalance: 1.2,
    balancedGameRate: 0.4,
    balanceKind: "neutral",
    avgHighLeverageImpactPerGame: 10.5,
    highLeverageImpactDelta: 2.3,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<RefProfile> = {}): RefProfile {
  return {
    slug: "test",
    name: "Test",
    number: 1,
    games: 100,
    avgTotalPoints: 45,
    overRate: 0.5,
    avgFouls: 12,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2024"],
    recentGames: [],
    ...overrides,
  };
}

describe("NFL penalty shrinkage", () => {
  it("prefers high-leverage minutes for shrinkage sample N", () => {
    assert.equal(
      resolvePenaltyShrinkageSampleN(
        makeProfile({ gsniHighLeverageMinutes: 42, games: 100 }),
      ),
      42,
    );
  });

  it("falls back to games when HL minutes are missing", () => {
    assert.equal(
      resolvePenaltyShrinkageSampleN(makeProfile({ games: 88 })),
      88,
    );
  });

  it("shrinks extreme penalty rates toward league averages for low N", () => {
    const shrunk = shrinkNflAnalyticsDisplay(makeAnalytics(), 18, 13, 95);
    assert.ok(Math.abs(shrunk.flagsDelta.display) < 3);
    assert.ok(shrunk.avgFlagsPerGame.display < 16);
    assert.match(shrunk.avgFlagsPerGame.tooltip, /Observed/i);
  });
});

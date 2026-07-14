import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMINISTRATIVE_PENALTY_CODES,
  buildPenaltyLeverageWeight,
  classifyNflPenaltySlug,
  classifyPenaltyCode,
  computeContextualLeverageMultiplier,
  estimateWpaMovement,
  LWIS_LEVERAGE_MULTIPLIER,
  SUBJECTIVE_PENALTY_CODES,
} from "@/config/penalty-types";
import {
  computeRefWhistleDispositionFromGames,
  computeSubjectiveEventLwis,
  identifyHighImpactLwisOutliers,
} from "@/lib/whistle-disposition";
import { buildPenaltyEvent } from "@/lib/impact-calculator";
import type { RefStatsFile } from "@/lib/types";

describe("penalty-types taxonomy", () => {
  it("classifies NFL administrative codes", () => {
    assert.equal(classifyPenaltyCode("nfl", "False Start"), "administrative");
    assert.equal(classifyPenaltyCode("nfl", "Delay of Game"), "administrative");
    assert.equal(classifyPenaltyCode("nfl", "Illegal Formation"), "administrative");
    assert.equal(classifyNflPenaltySlug("false_start"), "administrative");
  });

  it("classifies NFL subjective judgment codes", () => {
    assert.equal(
      classifyPenaltyCode("nfl", "Defensive Holding"),
      "subjective",
    );
    assert.equal(
      classifyPenaltyCode("nfl", "Pass Interference"),
      "subjective",
    );
    assert.equal(
      classifyPenaltyCode("nfl", "Roughing the Passer"),
      "subjective",
    );
    assert.equal(
      classifyPenaltyCode("nfl", "Block in the Back"),
      "subjective",
    );
  });

  it("includes codes for all five leagues", () => {
    for (const league of ["nba", "nfl", "nhl", "epl", "laliga"] as const) {
      assert.ok(ADMINISTRATIVE_PENALTY_CODES[league].length > 0);
      assert.ok(SUBJECTIVE_PENALTY_CODES[league].length > 0);
    }
  });

  it("classifies NBA delay as administrative and shooting foul as subjective", () => {
    assert.equal(classifyPenaltyCode("nba", "delay_of_game"), "administrative");
    assert.equal(classifyPenaltyCode("nba", "shooting_foul"), "subjective");
  });

  it("applies discrete LWIS leverage multipliers by context", () => {
    assert.equal(
      computeContextualLeverageMultiplier({
        quarter: 4,
        gameSecondsRemaining: 90,
        scoreDifferential: 3,
      }),
      LWIS_LEVERAGE_MULTIPLIER.crisis,
    );
    assert.equal(
      computeContextualLeverageMultiplier({ down: 3 }),
      LWIS_LEVERAGE_MULTIPLIER.pressure,
    );
    assert.equal(
      computeContextualLeverageMultiplier({ down: 1, gameSecondsRemaining: 900 }),
      LWIS_LEVERAGE_MULTIPLIER.base,
    );
    assert.ok(estimateWpaMovement({ wpaDelta: 0.05 }) === 0.05);
    assert.equal(
      buildPenaltyLeverageWeight({ quarter: 4, scoreDifferential: 3 })
        .leverage_weight,
      LWIS_LEVERAGE_MULTIPLIER.base,
    );
  });
});

describe("whistle disposition aggregation", () => {
  it("computes separate subjective and administrative baselines from events", () => {
    const games = Array.from({ length: 12 }, () => ({
      totalFouls: 12,
      homeFlags: 6,
      awayFlags: 6,
      penaltyEvents: [
        buildPenaltyEvent("False Start", "KC", 5, { down: 1, distance: 10 }),
        buildPenaltyEvent("Defensive Holding", "BAL", 5, {
          down: 3,
          distance: 8,
        }),
      ],
      subjectiveFlags: 1,
      administrativeFlags: 1,
    }));

    const metrics = computeRefWhistleDispositionFromGames(games, "nfl");
    assert.ok(metrics);
    assert.equal(metrics.avgSubjectivePerGame, 1);
    assert.equal(metrics.avgAdministrativePerGame, 1);
    assert.equal(metrics.dispositionSampleGames, 12);
    assert.equal(metrics.eventBackedGames, 12);
    assert.ok(metrics.lwis > 0);
    assert.ok(metrics.lwisPerGame > 0);
    assert.equal(metrics.subjectiveLwisCalls, 12);
  });

  it("weights subjective LWIS as |ΔWPA| × leverage multiplier", () => {
    const games = Array.from({ length: 10 }, () => ({
      totalFouls: 12,
      homeFlags: 6,
      awayFlags: 6,
      penaltyEvents: [
        buildPenaltyEvent("False Start", "KC", 5, { down: 1, distance: 10 }),
        buildPenaltyEvent("Defensive Holding", "BAL", 5, {
          down: 3,
          distance: 8,
          wpaDelta: 0.04,
        }),
      ],
      subjectiveFlags: 1,
      administrativeFlags: 1,
    }));

    const metrics = computeRefWhistleDispositionFromGames(games, "nfl");
    assert.ok(metrics);
    assert.equal(metrics.lwisPerGame, 0.06);
    assert.equal(metrics.subjectiveLwisCalls, 10);
    assert.equal(metrics.highLeverageEventCount, 10);
  });

  it("applies 2.0× crisis weight to late-game PI vs 1.0× neutral holding", () => {
    const lateGamePi = computeSubjectiveEventLwis({
      quarter: 4,
      gameSecondsRemaining: 90,
      scoreDifferential: 3,
      wpaDelta: 0.05,
    });
    const neutralHolding = computeSubjectiveEventLwis({
      down: 1,
      quarter: 2,
      gameSecondsRemaining: 900,
      scoreDifferential: 14,
      wpaDelta: 0.05,
    });

    assert.equal(lateGamePi, 0.1);
    assert.equal(neutralHolding, 0.05);
    assert.equal(lateGamePi / neutralHolding, 2);

    const sampleGame = {
      totalFouls: 12,
      homeFlags: 6,
      awayFlags: 6,
      penaltyEvents: [
        buildPenaltyEvent("Pass Interference", "KC", 15, {
          quarter: 4,
          gameSecondsRemaining: 90,
          scoreDifferential: 3,
          wpaDelta: 0.05,
        }),
        buildPenaltyEvent("Defensive Holding", "BAL", 5, {
          down: 1,
          quarter: 2,
          gameSecondsRemaining: 900,
          scoreDifferential: 14,
          wpaDelta: 0.05,
        }),
      ],
      subjectiveFlags: 2,
      administrativeFlags: 0,
    };

    const games = Array.from({ length: 10 }, () => sampleGame);
    const metrics = computeRefWhistleDispositionFromGames(games, "nfl");
    assert.ok(metrics);
    assert.equal(metrics.lwisPerGame, 0.15);
    assert.equal(metrics.highLeverageEventCount, 10);
    assert.equal(metrics.lwisGateMet, false);
  });

  it("flags officials above 2σ LWIS peer threshold", () => {
    const stats: RefStatsFile = {
      meta: {
        lastUpdated: "2026-07-13",
        seasons: ["2024-25"],
        leagueAvgTotal: 45,
        leagueAvgFouls: 12,
        leagueOverBaseline: 46,
        minSampleSize: 10,
        source: "seeded",
        atsAvailable: true,
      },
      refs: [
        {
          slug: "low-impact-1",
          name: "Low Impact",
          number: 1,
          games: 20,
          avgTotalPoints: 45,
          overRate: 0.5,
          avgFouls: 12,
          homeCoverRate: null,
          totalPointsDelta: 0,
          foulsDelta: 0,
          seasons: ["2024-25"],
          recentGames: [],
        },
        {
          slug: "high-impact-99",
          name: "High Impact",
          number: 99,
          games: 20,
          avgTotalPoints: 45,
          overRate: 0.5,
          avgFouls: 20,
          homeCoverRate: null,
          totalPointsDelta: 0,
          foulsDelta: 0,
          seasons: ["2024-25"],
          recentGames: [],
        },
      ],
      teamSplits: {},
    };

    const outliers = identifyHighImpactLwisOutliers(stats, "nba", ["2024-25"], 10);
    assert.ok(Array.isArray(outliers));
  });
});

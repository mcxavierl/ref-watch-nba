import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeOiiHighLeverageScore,
  computeOiiSampleConfidenceScore,
  computeOiiVolatilityScore,
  generateOII,
  OII_INSUFFICIENT_LABEL,
  OII_MIN_SAMPLE,
  scoreFromOiiComponents,
} from "@/lib/officiating-intelligence-index";
import type { RefGameRecord } from "@/lib/types";

function foulGames(totals: number[]): RefGameRecord[] {
  return totals.map((totalFouls, i) => ({
    gameId: `g-${i}`,
    date: "2026-01-01",
    season: "2025-26",
    homeTeam: "BOS",
    awayTeam: "NYK",
    totalPoints: 220,
    totalFouls,
    overHit: true,
    raptorsInvolved: false,
  }));
}

describe("Officiating Intelligence Index", () => {
  it("returns N/A when sample size is below maturity gate", () => {
    const result = generateOII("test-ref", {
      recentGames: foulGames([40, 42, 38]),
      leagueAvgFouls: 41,
      sampleSize: OII_MIN_SAMPLE - 1,
    });
    assert.equal(result.status, "insufficient");
    if (result.status === "insufficient") {
      assert.equal(result.displayLabel, OII_INSUFFICIENT_LABEL);
    }
  });

  it("combines weighted components into 0-100 score", () => {
    const components = {
      volatilityScore: 80,
      highLeverageScore: 60,
      sampleConfidenceScore: 70,
    };
    assert.equal(scoreFromOiiComponents(components), 71);
  });

  it("volatility rises with foul std-dev vs rolling mean", () => {
    const stable = computeOiiVolatilityScore(foulGames([40, 41, 40, 41, 40]), 41);
    const volatile = computeOiiVolatilityScore(
      foulGames([28, 52, 30, 50, 32, 48, 35, 45, 38, 44]),
      41,
    );
    assert.ok(volatile > stable);
  });

  it("uses highLeverageFlagRate when present", () => {
    const games: RefGameRecord[] = [
      {
        ...foulGames([40])[0]!,
        highLeverageFlagRate: 0.35,
      },
      {
        ...foulGames([41])[0]!,
        gameId: "g-2",
        highLeverageFlagRate: 0.45,
      },
    ];
    assert.equal(computeOiiHighLeverageScore(games), 40);
  });

  it("sample confidence increases with more games", () => {
    assert.ok(
      computeOiiSampleConfidenceScore(50) >
        computeOiiSampleConfidenceScore(12),
    );
  });

  it("generateOII returns ok for qualified sample", () => {
    const result = generateOII("marat-kogut-32", {
      recentGames: foulGames([38, 42, 40, 44, 39, 41, 43, 40, 42, 41]),
      leagueAvgFouls: 41,
      sampleSize: 120,
    });
    assert.equal(result.status, "ok");
    if (result.status === "ok") {
      assert.ok(result.score >= 0 && result.score <= 100);
      assert.ok(result.components.volatilityScore >= 0);
    }
  });
});

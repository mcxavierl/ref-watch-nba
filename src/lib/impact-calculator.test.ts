import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPenaltyEvent,
  classifyLeverageTier,
  computeLeverageScore,
  normalizeNflPenaltyType,
  aggregateGameLeverageImpact,
} from "@/lib/impact-calculator";

describe("normalizeNflPenaltyType", () => {
  it("maps common penalty labels to slugs", () => {
    assert.equal(normalizeNflPenaltyType("Defensive Holding"), "defensive_holding");
    assert.equal(normalizeNflPenaltyType("False Start"), "false_start");
    assert.equal(normalizeNflPenaltyType("Defensive Pass Interference"), "defensive_pass_interference");
  });
});

describe("computeLeverageScore", () => {
  it("scores defensive holding on 3rd-and-long above a false start", () => {
    const holding = computeLeverageScore({
      type: "defensive_holding",
      down: 3,
      distance: 12,
      yardLine: 18,
      quarter: 4,
      gameSecondsRemaining: 180,
      scoreDifferential: 3,
      wpaDelta: 0.05,
    });
    const falseStart = computeLeverageScore({
      type: "false_start",
      down: 1,
      distance: 10,
      yardLine: 65,
      quarter: 1,
    });
    assert.ok(holding > falseStart * 2);
    assert.equal(classifyLeverageTier({
      type: "defensive_holding",
      down: 3,
      distance: 12,
      yardLine: 18,
      wpaDelta: 0.05,
    }), "critical");
  });

  it("aggregates game leverage impact from events", () => {
    const events = [
      buildPenaltyEvent("Defensive Holding", "KC", 5, {
        down: 3,
        distance: 9,
        yardLine: 22,
        wpaDelta: 0.04,
      }),
      buildPenaltyEvent("False Start", "BAL", 5, { down: 1, distance: 10 }),
    ];
    const summary = aggregateGameLeverageImpact(events);
    assert.equal(summary.flagCount, 2);
    assert.ok(summary.highLeverageScore > 0);
    assert.ok(summary.highLeverageFlagCount >= 1);
  });
});

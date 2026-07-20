import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMIN_RATIO_GAME_MANAGER_THRESHOLD,
  ADMIN_RATIO_PROCEDURAL_THRESHOLD,
  buildArchetypeTerminalBlurb,
  classifyAdminRatio,
  computeRefereeArchetype,
  consistencyScoreFromWhistleRates,
  whistleCoefficientOfVariation,
} from "@/lib/analytics/referee-archetypes";
import type { ArchetypeGameInput } from "@/lib/analytics/referee-archetypes";

function makeGame(
  overrides: Partial<ArchetypeGameInput> & Pick<ArchetypeGameInput, "homeScore" | "awayScore">,
): ArchetypeGameInput {
  return {
    totalFouls: 40,
    homeFlags: 7,
    awayFlags: 6,
    subjectiveFlags: 4,
    administrativeFlags: 9,
    ...overrides,
  };
}

describe("referee-archetypes", () => {
  it("classifies procedural stickler when admin ratio exceeds 1.5", () => {
    assert.equal(classifyAdminRatio(1.6), "procedural-stickler");
    assert.equal(classifyAdminRatio(ADMIN_RATIO_PROCEDURAL_THRESHOLD + 0.1), "procedural-stickler");
  });

  it("classifies game-flow manager when admin ratio is below 0.7", () => {
    assert.equal(classifyAdminRatio(0.5), "game-flow-manager");
    assert.equal(
      classifyAdminRatio(ADMIN_RATIO_GAME_MANAGER_THRESHOLD - 0.1),
      "game-flow-manager",
    );
  });

  it("classifies balanced whistle mix in the middle band", () => {
    assert.equal(classifyAdminRatio(1.0), "balanced");
    assert.equal(classifyAdminRatio(ADMIN_RATIO_GAME_MANAGER_THRESHOLD), "balanced");
    assert.equal(classifyAdminRatio(ADMIN_RATIO_PROCEDURAL_THRESHOLD), "balanced");
  });

  it("flags pressure sensitivity when close-game whistle rate jumps more than 20%", () => {
    const games: ArchetypeGameInput[] = [];
    for (let index = 0; index < 6; index += 1) {
      games.push(
        makeGame({
          homeScore: 20,
          awayScore: 18,
          homeFlags: 10,
          awayFlags: 10,
          subjectiveFlags: 4,
          administrativeFlags: 16,
        }),
      );
    }
    for (let index = 0; index < 6; index += 1) {
      games.push(
        makeGame({
          homeScore: 20,
          awayScore: 10,
          homeFlags: 6,
          awayFlags: 6,
          subjectiveFlags: 4,
          administrativeFlags: 8,
        }),
      );
    }

    const result = computeRefereeArchetype("nfl", games);
    assert.ok(result);
    assert.equal(result!.primary_archetype, "procedural-stickler");
    assert.equal(result!.pressure_sensitive, true);
    assert.ok((result!.pressure_delta_pct ?? 0) > 0.2);
  });

  it("maps low coefficient of variation to a higher consistency score", () => {
    const steady = [20, 20, 21, 19, 20, 20];
    const volatile = [10, 30, 12, 28, 11, 29];
    assert.ok(whistleCoefficientOfVariation(steady) < whistleCoefficientOfVariation(volatile));
    assert.ok(consistencyScoreFromWhistleRates(steady) > consistencyScoreFromWhistleRates(volatile));
    assert.ok(consistencyScoreFromWhistleRates(steady) >= 7);
    assert.ok(consistencyScoreFromWhistleRates(volatile) <= 4);
  });

  it("builds terminal blurbs with volatility and handicapping signal", () => {
    const blurb = buildArchetypeTerminalBlurb("procedural-stickler", 8, 0.12);
    assert.match(blurb, /Procedural Stickler/);
    assert.match(blurb, /Volatility is Low/);
    assert.match(blurb, /Stability for total-game handicapping/);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMIN_RATIO_GAME_MANAGER_THRESHOLD,
  ADMIN_RATIO_PROCEDURAL_THRESHOLD,
  classifyAdminRatio,
  computeRefereeArchetype,
  consistencyScoreFromWhistleRates,
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

  it("classifies game manager when admin ratio is below 0.7", () => {
    assert.equal(classifyAdminRatio(0.5), "game-manager");
    assert.equal(classifyAdminRatio(ADMIN_RATIO_GAME_MANAGER_THRESHOLD - 0.1), "game-manager");
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
    assert.equal(result!.primaryArchetype, "procedural-stickler");
    assert.equal(result!.pressureSensitive, true);
    assert.ok((result!.pressureDeltaPct ?? 0) > 0.2);
  });

  it("maps low whistle-volume variance to a higher consistency score", () => {
    const steady = consistencyScoreFromWhistleRates([20, 20, 21, 19, 20, 20]);
    const volatile = consistencyScoreFromWhistleRates([10, 30, 12, 28, 11, 29]);
    assert.ok(steady > volatile);
    assert.ok(steady >= 7);
    assert.ok(volatile <= 4);
  });
});

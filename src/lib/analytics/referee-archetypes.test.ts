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
import { SAMPLE_SIZE_THRESHOLD } from "@/lib/analytics/sample-size";

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

function makeGameBatch(
  count: number,
  factory: (index: number) => ArchetypeGameInput,
): ArchetypeGameInput[] {
  return Array.from({ length: count }, (_, index) => factory(index));
}

describe("referee-archetypes", () => {
  it("classifies procedural stickler when admin ratio exceeds 1.5", () => {
    assert.equal(classifyAdminRatio(1.6, "nba"), "procedural-stickler");
    assert.equal(
      classifyAdminRatio(ADMIN_RATIO_PROCEDURAL_THRESHOLD + 0.1, "nba"),
      "procedural-stickler",
    );
  });

  it("classifies game-flow manager when admin ratio is below 0.7", () => {
    assert.equal(classifyAdminRatio(0.5, "nba"), "game-flow-manager");
    assert.equal(
      classifyAdminRatio(ADMIN_RATIO_GAME_MANAGER_THRESHOLD - 0.1, "nba"),
      "game-flow-manager",
    );
  });

  it("classifies balanced whistle mix in the middle band", () => {
    assert.equal(classifyAdminRatio(1.0, "nba"), "balanced");
    assert.equal(classifyAdminRatio(ADMIN_RATIO_GAME_MANAGER_THRESHOLD, "nba"), "balanced");
    assert.equal(classifyAdminRatio(ADMIN_RATIO_PROCEDURAL_THRESHOLD, "nba"), "balanced");
  });

  it("returns null when sample size is below the professional threshold", () => {
    const games = makeGameBatch(SAMPLE_SIZE_THRESHOLD - 1, () =>
      makeGame({ homeScore: 20, awayScore: 18 }),
    );
    assert.equal(computeRefereeArchetype("nba", games), null);
    assert.equal(consistencyScoreFromWhistleRates(games.map(() => 20)), null);
  });

  it("flags pressure sensitivity when close-game whistle rate jumps more than 20%", () => {
    const games = [
      ...makeGameBatch(8, () =>
        makeGame({
          homeScore: 20,
          awayScore: 18,
          homeFlags: 10,
          awayFlags: 10,
          subjectiveFlags: 4,
          administrativeFlags: 16,
        }),
      ),
      ...makeGameBatch(8, () =>
        makeGame({
          homeScore: 20,
          awayScore: 10,
          homeFlags: 6,
          awayFlags: 6,
          subjectiveFlags: 4,
          administrativeFlags: 8,
        }),
      ),
    ];

    const result = computeRefereeArchetype("nfl", games);
    assert.ok(result);
    assert.equal(result!.primary_archetype, "procedural-stickler");
    assert.equal(result!.pressure_sensitive, true);
    assert.ok((result!.pressure_delta_pct ?? 0) > 0.2);
    assert.equal(result!.data_quality, "ok");
  });

  it("maps low coefficient of variation to a higher consistency score", () => {
    const steady = Array.from({ length: SAMPLE_SIZE_THRESHOLD }, () => 20);
    const volatile = Array.from({ length: SAMPLE_SIZE_THRESHOLD }, (_, index) =>
      index % 2 === 0 ? 10 : 30,
    );
    assert.ok(whistleCoefficientOfVariation(steady) < whistleCoefficientOfVariation(volatile));
    const steadyScore = consistencyScoreFromWhistleRates(steady);
    const volatileScore = consistencyScoreFromWhistleRates(volatile);
    assert.ok(steadyScore !== null && volatileScore !== null);
    assert.ok(steadyScore > volatileScore);
    assert.ok(steadyScore >= 7);
    assert.ok(volatileScore <= 4);
  });

  it("builds terminal blurbs with volatility and handicapping signal", () => {
    const blurb = buildArchetypeTerminalBlurb("procedural-stickler", 8, 0.12);
    assert.match(blurb, /Procedural Stickler/);
    assert.match(blurb, /Volatility is Low/);
    assert.match(blurb, /Stability for total-game handicapping/);
  });
});

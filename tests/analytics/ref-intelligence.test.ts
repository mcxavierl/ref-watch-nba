import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ARCHETYPE_DISPLAY_NAMES,
  computeRefereeArchetype,
  consistencyScoreFromWhistleRates,
  whistleCoefficientOfVariation,
  type ArchetypeGameInput,
} from "@/lib/analytics/referee-archetypes";
import {
  buildLeverageInsight,
  computeLeverageIndex,
  type LeverageGameInput,
} from "@/lib/analytics/leverage-sensitivity";
import { SAMPLE_SIZE_THRESHOLD } from "@/lib/analytics/sample-size";

const INSUFFICIENT_SAMPLE_GAMES = 9;

function makeArchetypeGame(
  overrides: Partial<ArchetypeGameInput> & Pick<ArchetypeGameInput, "homeScore" | "awayScore">,
): ArchetypeGameInput {
  return {
    totalFouls: 40,
    subjectiveFlags: 4,
    administrativeFlags: 4,
    ...overrides,
  };
}

function makeArchetypeBatch(
  count: number,
  factory: (index: number) => ArchetypeGameInput,
): ArchetypeGameInput[] {
  return Array.from({ length: count }, (_, index) => factory(index));
}

function makeLeverageGame(
  overrides: Partial<LeverageGameInput> & Pick<LeverageGameInput, "homeScore" | "awayScore">,
): LeverageGameInput {
  return {
    totalFouls: 40,
    ...overrides,
  };
}

function makeCloseHighLeverageGame(): LeverageGameInput {
  return makeLeverageGame({
    homeScore: 102,
    awayScore: 100,
    totalFouls: 44,
    whistlePeriodSplits: {
      unit: "quarter",
      source: "boxscore",
      buckets: [
        { period: 1, home: 5, away: 5 },
        { period: 2, home: 5, away: 5 },
        { period: 3, home: 5, away: 5 },
        { period: 4, home: 10, away: 9 },
      ],
    },
  });
}

describe("ref intelligence elite metrics", () => {
  describe("archetype classification", () => {
    it("tags Procedural Stickler when admin_ratio exceeds 1.5", () => {
      const games = makeArchetypeBatch(SAMPLE_SIZE_THRESHOLD, () =>
        makeArchetypeGame({
          homeScore: 108,
          awayScore: 102,
          subjectiveFlags: 4,
          administrativeFlags: 10,
        }),
      );

      const result = computeRefereeArchetype("nba", games);

      assert.ok(result);
      assert.equal(result!.primary_archetype, "procedural-stickler");
      assert.equal(result!.displayName, ARCHETYPE_DISPLAY_NAMES["procedural-stickler"]);
      assert.equal(result!.displayName, "Procedural Stickler");
      assert.ok(result!.admin_ratio > 1.5);
    });

    it("tags Game-Flow Manager when admin_ratio is below 0.7", () => {
      const games = makeArchetypeBatch(SAMPLE_SIZE_THRESHOLD, () =>
        makeArchetypeGame({
          homeScore: 108,
          awayScore: 102,
          subjectiveFlags: 10,
          administrativeFlags: 6,
        }),
      );

      const result = computeRefereeArchetype("nba", games);

      assert.ok(result);
      assert.equal(result!.primary_archetype, "game-flow-manager");
      assert.equal(result!.displayName, ARCHETYPE_DISPLAY_NAMES["game-flow-manager"]);
      assert.equal(result!.displayName, "Game-Flow Manager");
      assert.ok(result!.admin_ratio < 0.7);
    });
  });

  describe("leverage sensitivity", () => {
    it("flags High Leverage Sensitivity when Q4 fouls rise in close games", () => {
      const games = Array.from({ length: SAMPLE_SIZE_THRESHOLD }, () =>
        makeCloseHighLeverageGame(),
      );

      const result = computeLeverageIndex("nba", games);

      assert.equal(result.data_quality, "ok");
      assert.ok(result.leverage_index !== null);
      assert.ok(result.leverage_index! > 0.2);
      assert.equal(result.leverage_profile, "high-leverage-sensitivity");
      assert.match(buildLeverageInsight(result.leverage_profile), /High Leverage Sensitivity/);
      assert.ok(result.close_game_sample >= 3);
    });
  });

  describe("consistency score volatility", () => {
    it("assigns a higher CV to volatile whistle totals than consistent totals", () => {
      const volatile = [2, 18, 5, 20];
      const consistent = [10, 11, 10, 11];

      const volatileCv = whistleCoefficientOfVariation(volatile);
      const consistentCv = whistleCoefficientOfVariation(consistent);

      assert.ok(volatileCv > consistentCv);
      assert.ok(volatileCv > 0.35);
      assert.ok(consistentCv < 0.18);
    });

    it("maps low CV whistle logs to a higher consistency score than volatile logs", () => {
      const volatile = Array.from({ length: SAMPLE_SIZE_THRESHOLD }, (_, index) =>
        [2, 18, 5, 20][index % 4]!,
      );
      const consistent = Array.from({ length: SAMPLE_SIZE_THRESHOLD }, (_, index) =>
        [10, 11, 10, 11][index % 4]!,
      );

      const volatileScore = consistencyScoreFromWhistleRates(volatile);
      const consistentScore = consistencyScoreFromWhistleRates(consistent);

      assert.ok(volatileScore !== null && consistentScore !== null);
      assert.ok(consistentScore > volatileScore);
      assert.ok(consistentScore >= 7);
      assert.ok(volatileScore <= 4);
    });
  });

  describe("insufficient data gatekeeping", () => {
    it("returns null archetype output below the professional sample gate", () => {
      const games = makeArchetypeBatch(INSUFFICIENT_SAMPLE_GAMES, () =>
        makeArchetypeGame({
          homeScore: 108,
          awayScore: 102,
          subjectiveFlags: 4,
          administrativeFlags: 10,
        }),
      );

      assert.ok(INSUFFICIENT_SAMPLE_GAMES < SAMPLE_SIZE_THRESHOLD);
      assert.equal(computeRefereeArchetype("nba", games), null);
      assert.equal(
        consistencyScoreFromWhistleRates(games.map(() => 20)),
        null,
      );
    });

    it("returns insufficient data for leverage metrics below the sample gate", () => {
      const games = Array.from({ length: INSUFFICIENT_SAMPLE_GAMES }, () =>
        makeCloseHighLeverageGame(),
      );

      const result = computeLeverageIndex("nba", games);

      assert.equal(result.data_quality, "insufficient");
      assert.equal(result.leverage_index, null);
      assert.equal(result.leverage_profile, "neutral");
    });
  });
});

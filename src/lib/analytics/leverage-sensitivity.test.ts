import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLeverageInsight,
  classifyLeverageProfile,
  computeLeverageIndex,
  LEVERAGE_INDEX_THRESHOLD,
  pressureGaugeState,
} from "@/lib/analytics/leverage-sensitivity";
import type { LeverageGameInput } from "@/lib/analytics/leverage-sensitivity";
import { SAMPLE_SIZE_THRESHOLD } from "@/lib/analytics/sample-size";

function makeGame(
  overrides: Partial<LeverageGameInput> & Pick<LeverageGameInput, "homeScore" | "awayScore">,
): LeverageGameInput {
  return {
    totalFouls: 40,
    ...overrides,
  };
}

function makeCloseHighLeverageGame(): LeverageGameInput {
  return makeGame({
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

function makeCloseLowLeverageGame(): LeverageGameInput {
  return makeGame({
    homeScore: 101,
    awayScore: 99,
    totalFouls: 36,
    whistlePeriodSplits: {
      unit: "quarter",
      source: "boxscore",
      buckets: [
        { period: 1, home: 6, away: 6 },
        { period: 2, home: 6, away: 6 },
        { period: 3, home: 5, away: 5 },
        { period: 4, home: 2, away: 2 },
      ],
    },
  });
}

describe("leverage-sensitivity", () => {
  it("returns insufficient data below the professional sample threshold", () => {
    const games = Array.from({ length: SAMPLE_SIZE_THRESHOLD - 1 }, () =>
      makeCloseHighLeverageGame(),
    );
    const result = computeLeverageIndex("nba", games);
    assert.equal(result.data_quality, "insufficient");
    assert.equal(result.leverage_index, null);
  });

  it("classifies high leverage sensitivity when late close-game rate rises more than 20%", () => {
    const games = Array.from({ length: SAMPLE_SIZE_THRESHOLD }, () =>
      makeCloseHighLeverageGame(),
    );

    const result = computeLeverageIndex("nba", games);
    assert.equal(result.data_quality, "ok");
    assert.ok(result.leverage_index !== null);
    assert.ok((result.leverage_index ?? 0) > LEVERAGE_INDEX_THRESHOLD);
    assert.equal(result.leverage_profile, "high-leverage-sensitivity");
    assert.equal(pressureGaugeState(result.leverage_profile), "tightens-up");
    assert.match(buildLeverageInsight(result.leverage_profile), /High Leverage Sensitivity/);
  });

  it("classifies swallows the whistle when late close-game rate drops more than 20%", () => {
    const games = Array.from({ length: SAMPLE_SIZE_THRESHOLD }, () =>
      makeCloseLowLeverageGame(),
    );

    const result = computeLeverageIndex("nba", games);
    assert.equal(result.data_quality, "ok");
    assert.ok(result.leverage_index !== null);
    assert.ok((result.leverage_index ?? 0) < -LEVERAGE_INDEX_THRESHOLD);
    assert.equal(result.leverage_profile, "swallows-whistle");
    assert.equal(pressureGaugeState(result.leverage_profile), "swallows-whistle");
  });

  it("returns neutral when leverage delta stays inside the 20% band", () => {
    assert.equal(classifyLeverageProfile(0.1), "neutral");
    assert.equal(classifyLeverageProfile(-0.05), "neutral");
    assert.equal(classifyLeverageProfile(null), "neutral");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateTacticalFinalTwoMinuteWhistles,
  collectLeverageWhistleEvents,
  computeTacticalLateRateAdjustment,
  LEVERAGE_INTENTIONAL_FOUL_FILTER_NOTE,
  tacticalFoulWeight,
} from "@/lib/analytics/leverage";
import type { LeverageGameInput } from "@/lib/analytics/leverage-sensitivity";

describe("leverage tactical foul filter", () => {
  it("applies close, mid-range, and blowout tactical weights", () => {
    assert.equal(tacticalFoulWeight(4), 0.5);
    assert.equal(tacticalFoulWeight(6), 0.5);
    assert.equal(tacticalFoulWeight(8), 1.0);
    assert.equal(tacticalFoulWeight(10), 1.0);
    assert.equal(tacticalFoulWeight(14), 1.2);
  });

  it("discounts close-game whistles and weights blowout whistles in final two minutes", () => {
    const aggregate = aggregateTacticalFinalTwoMinuteWhistles([
      { gameSecondsRemaining: 90, homeScore: 102, awayScore: 100, whistles: 2 },
      { gameSecondsRemaining: 45, homeScore: 110, awayScore: 96, whistles: 1 },
      { gameSecondsRemaining: 300, homeScore: 100, awayScore: 99, whistles: 5 },
    ]);

    assert.equal(aggregate.eventCount, 2);
    assert.equal(aggregate.rawWhistles, 3);
    assert.equal(aggregate.adjustedWhistles, 2 * 0.5 + 1 * 1.2);
  });

  it("synthesizes final-two-minute events from the last regulation period split", () => {
    const game: LeverageGameInput = {
      homeScore: 104,
      awayScore: 101,
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
    };

    const events = collectLeverageWhistleEvents("nba", game);
    assert.equal(events.length, 1);
    assert.ok((events[0]?.whistles ?? 0) > 0);

    const adjusted = computeTacticalLateRateAdjustment("nba", game, 19);
    assert.ok(adjusted.adjustedLateRate > 0);
    assert.equal(adjusted.eventBacked, true);
    assert.ok(adjusted.adjustedLateRate < 19);
  });

  it("documents intentional-foul noise filtering in metadata note", () => {
    assert.match(LEVERAGE_INTENTIONAL_FOUL_FILTER_NOTE, /intentional-foul noise/i);
    assert.match(LEVERAGE_INTENTIONAL_FOUL_FILTER_NOTE, /final two minutes/i);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MIN_TOTAL_GAMES_FOR_CLAIMED_SEASONS,
  runVolumeRegressionChecks,
} from "./volume-regression";

describe("volume regression gates", () => {
  it("enforces conservative floors for all live leagues", () => {
    assert.ok(MIN_TOTAL_GAMES_FOR_CLAIMED_SEASONS.nba.minTotal >= 10_000);
    assert.ok(MIN_TOTAL_GAMES_FOR_CLAIMED_SEASONS.nhl.minTotal >= 10_000);
    assert.ok(MIN_TOTAL_GAMES_FOR_CLAIMED_SEASONS.nfl.minTotal >= 2_500);
    assert.ok(MIN_TOTAL_GAMES_FOR_CLAIMED_SEASONS.epl.minTotal >= 3_500);
  });

  it("passes on current committed data", () => {
    const { failures, summaries } = runVolumeRegressionChecks();
    assert.equal(
      failures.length,
      0,
      failures.join("\n"),
    );
    assert.ok(summaries.length >= 5);
    for (const row of summaries) {
      assert.ok(row.refStatsGames > 0, `${row.league} ref-stats games`);
      assert.ok(row.matrixBaselineGames > 0, `${row.league} matrix baseline`);
      assert.ok(row.matrixTopPanel > 0, `${row.league} top panel`);
      assert.ok(row.matrixBottomPanel > 0, `${row.league} bottom panel`);
    }
  });
});

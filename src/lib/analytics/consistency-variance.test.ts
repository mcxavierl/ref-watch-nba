import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyConsistencyLabel,
  computeConsistencyIndex,
  computeConsistencyVariance,
  CONSISTENCY_INDEX_NEUTRAL,
  leagueWhistleStdDevFromGameTotals,
} from "@/lib/analytics/consistency-variance";

describe("consistency-variance", () => {
  it("computes league and official whistle standard deviation", () => {
    const leagueTotals = [40, 42, 38, 41, 39, 43, 37, 40];
    const leagueStdDev = leagueWhistleStdDevFromGameTotals(leagueTotals);
    assert.ok(leagueStdDev > 0);

    const steadyOfficial = [40, 41, 39, 40, 41, 39, 40, 40, 41, 39, 40, 41, 39, 40, 40];
    const volatileOfficial = [28, 52, 31, 49, 30, 50, 29, 48, 33, 47, 27, 51, 34, 46, 32];

    const steady = computeConsistencyVariance(steadyOfficial, leagueStdDev, {
      minSampleGames: 15,
    });
    const volatile = computeConsistencyVariance(volatileOfficial, leagueStdDev, {
      minSampleGames: 15,
    });

    assert.ok((steady.consistency_index ?? 0) > (volatile.consistency_index ?? 0));
    assert.equal(steady.consistency_classification_label, "robotic-low-variance");
    assert.equal(volatile.consistency_classification_label, "volatile-high-variance");
  });

  it("maps league-average variance to a neutral consistency index", () => {
    const leagueStdDev = 5;
    const index = computeConsistencyIndex(leagueStdDev, leagueStdDev);
    assert.equal(index, CONSISTENCY_INDEX_NEUTRAL);
    assert.equal(
      classifyConsistencyLabel(index, 20),
      "league-average",
    );
  });

  it("withholds score when sample is below the professional threshold", () => {
    const result = computeConsistencyVariance([40, 42, 38], 5, {
      minSampleGames: 15,
    });
    assert.equal(result.consistency_index, null);
    assert.equal(result.consistency_classification_label, "insufficient-sample");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DATA_SUFFICIENCY_THRESHOLDS,
  formatGsniMinutesThreshold,
  formatOfficialGamesThreshold,
  gsniHighLeverageThresholdForLeague,
  meetsDataSufficiency,
  mergeSufficiencyLists,
  partitionByDataSufficiency,
} from "@/lib/data-sufficiency";

describe("data-sufficiency", () => {
  it("meetsDataSufficiency compares sample size to threshold", () => {
    assert.equal(meetsDataSufficiency(30, 30), true);
    assert.equal(meetsDataSufficiency(29, 30), false);
    assert.equal(meetsDataSufficiency(50, 50), true);
  });

  it("partitionByDataSufficiency splits rows", () => {
    const items = [{ games: 40 }, { games: 10 }, { games: 30 }];
    const { sufficient, insufficient } = partitionByDataSufficiency(
      items,
      (item) => item.games >= 30,
    );
    assert.deepEqual(sufficient.map((row) => row.games), [40, 30]);
    assert.deepEqual(insufficient.map((row) => row.games), [10]);
  });

  it("mergeSufficiencyLists hides insufficient rows by default", () => {
    const sufficient = [{ id: "a" }];
    const insufficient = [{ id: "b" }];
    assert.deepEqual(
      mergeSufficiencyLists(sufficient, insufficient, false).map((row) => row.id),
      ["a"],
    );
    assert.deepEqual(
      mergeSufficiencyLists(sufficient, insufficient, true).map((row) => row.id),
      ["a", "b"],
    );
  });

  it("exposes GSNI minute thresholds by league", () => {
    assert.equal(
      gsniHighLeverageThresholdForLeague("nba"),
      DATA_SUFFICIENCY_THRESHOLDS.gsniHighLeverageMinutesNba,
    );
    assert.equal(
      gsniHighLeverageThresholdForLeague("nfl"),
      DATA_SUFFICIENCY_THRESHOLDS.gsniHighLeverageMinutesNfl,
    );
    assert.match(formatOfficialGamesThreshold(30), /30-game minimum/);
    assert.match(formatGsniMinutesThreshold(50, "nba"), /50 high-leverage foul minutes/);
    assert.match(formatGsniMinutesThreshold(25, "nfl"), /25 high-leverage penalty minutes/);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { refreshBaselinesFromGameLogs } from "./baselines";

describe("refreshBaselinesFromGameLogs", () => {
  it("computes EPL and La Liga baselines when game logs exist", () => {
    const file = refreshBaselinesFromGameLogs("test refresh");
    assert.equal(file.EPL.usingFallback, false);
    assert.equal(file.LALIGA.usingFallback, false);
    assert.ok(file.EPL.aggregate.gameCount >= 3_500);
    assert.ok(file.LALIGA.aggregate.gameCount >= 1_500);
    assert.ok(Object.keys(file.EPL.seasons).length >= 2);
    assert.ok(Object.keys(file.LALIGA.seasons).length >= 2);
  });
});

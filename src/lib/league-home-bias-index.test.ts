import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeLeagueHomeCoverDelta } from "@/lib/league-home-bias-index";

describe("computeLeagueHomeCoverDelta", () => {
  it("returns CBB home cover delta from external spread lines", () => {
    const result = computeLeagueHomeCoverDelta("cbb");
    assert.ok(result);
    assert.match(result.value, /^[+-]\d+\.\d%$/);
    assert.ok(result.games >= 1000);
    assert.ok(result.coverRate > 0.45 && result.coverRate < 0.55);
  });
});

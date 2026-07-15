import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareGameIdSets } from "./integrity-check";

describe("CFB integrity check", () => {
  it("finds missing and extra game ids", () => {
    const result = compareGameIdSets(["1", "2", "3"], ["2", "3", "4"]);
    assert.deepEqual(result.missingGameIds, ["1"]);
    assert.deepEqual(result.extraGameIds, ["4"]);
  });

  it("passes when sets match", () => {
    const result = compareGameIdSets(["a", "b"], ["a", "b"]);
    assert.equal(result.missingGameIds.length, 0);
    assert.equal(result.extraGameIds.length, 0);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isNflSimulatedData,
  isNflVerifiedData,
} from "./data-source";

describe("NFL data source honesty", () => {
  it("treats espn as verified", () => {
    assert.equal(isNflVerifiedData("espn"), true);
    assert.equal(isNflSimulatedData("espn"), false);
  });

  it("treats seeded and historical as simulated", () => {
    assert.equal(isNflSimulatedData("seeded"), true);
    assert.equal(isNflSimulatedData("historical"), true);
  });

  it("treats hybrid as verified", () => {
    assert.equal(isNflVerifiedData("hybrid"), true);
    assert.equal(isNflSimulatedData("hybrid"), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isNhlHybridData,
  isNhlSimulatedData,
  isNhlVerifiedData,
  nhlAssignmentsAreVerified,
} from "./data-source";

describe("NHL data source honesty", () => {
  it("treats nhl-api and hybrid as verified", () => {
    assert.equal(isNhlVerifiedData("nhl-api"), true);
    assert.equal(isNhlVerifiedData("hybrid"), true);
    assert.equal(isNhlSimulatedData("nhl-api"), false);
  });

  it("treats seeded and historical as simulated", () => {
    assert.equal(isNhlSimulatedData("seeded"), true);
    assert.equal(isNhlSimulatedData("historical"), true);
    assert.equal(isNhlSimulatedData("synthetic"), true);
  });

  it("recognizes hybrid source flag", () => {
    assert.equal(isNhlHybridData("hybrid"), true);
    assert.equal(isNhlHybridData("nhl-api"), false);
  });

  it("assignments are verified when sourced from nhl-api with games", () => {
    assert.equal(
      nhlAssignmentsAreVerified({ source: "nhl-api", games: [{ id: "1" } as never] }),
      true,
    );
    assert.equal(
      nhlAssignmentsAreVerified({ source: "seeded", games: [{ id: "1" } as never] }),
      false,
    );
    assert.equal(nhlAssignmentsAreVerified({ source: "nhl-api", games: [] }), false);
  });
});

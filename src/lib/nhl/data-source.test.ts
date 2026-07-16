import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isNhlHybridData,
  isNhlSimulatedData,
  isNhlVerifiedData,
  nhlAssignmentsAreVerified,
  nhlPreviewBannerMessage,
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

  it("preview banner warns on preview data", () => {
    const msg = nhlPreviewBannerMessage("seeded", "seeded");
    assert.match(msg, /Preview dataset/i);
    assert.match(msg, /placeholder schedules/i);
    assert.doesNotMatch(msg, /simulated|simulation|projected|projection/i);
  });

  it("preview banner notes synthetic lines for verified stats", () => {
    const msg = nhlPreviewBannerMessage("nhl-api", "nhl-api", true);
    assert.match(msg, /NHL API/i);
    assert.match(msg, /synthetic closing lines/i);
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

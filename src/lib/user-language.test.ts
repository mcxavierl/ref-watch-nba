import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { refTeamDataNote } from "@/lib/user-language";

describe("refTeamDataNote", () => {
  it("returns null for verified hybrid ingest (no simulated disclaimer)", () => {
    const note = refTeamDataNote({
      source: "hybrid",
      refTeamWinLossSource: "basketball-reference",
      data_verified: true,
      atsAvailable: false,
    });
    assert.equal(note, null);
  });

  it("returns null when ref×team W-L is not from BBR", () => {
    const note = refTeamDataNote({
      source: "nba-stats-api",
      data_verified: true,
    });
    assert.equal(note, null);
  });

  it("describes NBA Stats API sources without simulated language", () => {
    const note = refTeamDataNote({
      source: "nba-stats-api",
      refTeamWinLossSource: "basketball-reference",
      data_verified: false,
      atsAvailable: true,
    });
    assert.ok(note);
    assert.match(note, /Basketball-Reference/);
    assert.match(note, /NBA Stats API/);
    assert.doesNotMatch(note, /simulated|estimated/i);
  });
});

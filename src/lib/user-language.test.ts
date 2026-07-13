import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { refTeamDataNote, sanitizeUserFacingCopy } from "@/lib/user-language";

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

describe("sanitizeUserFacingCopy", () => {
  it("removes internal file paths from explainers", () => {
    const out = sanitizeUserFacingCopy(
      "Year-over-year context from 26 seasons in data/baselines.json (6,825 total games).",
    );
    assert.doesNotMatch(out, /data\/|\.json/);
    assert.match(out, /26 seasons/);
  });

  it("replaces npm run hints with plain language", () => {
    const out = sanitizeUserFacingCopy(
      "Re-run npm run compute-baselines after game logs are present.",
    );
    assert.doesNotMatch(out, /npm run/i);
    assert.match(out, /data refresh/i);
  });
});

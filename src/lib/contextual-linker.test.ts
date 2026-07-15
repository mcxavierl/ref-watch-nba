import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { linkLeagueNames } from "@/lib/contextual-linker";
import { relatedInsightsForLeague } from "@/lib/related-insights";

describe("contextual-linker", () => {
  it("returns plain text when no league names appear", () => {
    assert.equal(linkLeagueNames("No league references here."), "No league references here.");
  });
});

describe("related-insights", () => {
  it("returns up to three findings for a league", () => {
    const nba = relatedInsightsForLeague("NBA", 3);
    assert.ok(nba.length <= 3);
    for (const finding of nba) {
      assert.equal(finding.league, "NBA");
    }
  });
});

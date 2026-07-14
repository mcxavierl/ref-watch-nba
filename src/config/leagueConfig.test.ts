import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatLeagueSeasonStart } from "@/config/leagueConfig";
import { catalogStatusLabel } from "@/lib/league-catalog";

describe("league season start", () => {
  it("formats NBA season start as MM/DD", () => {
    assert.equal(formatLeagueSeasonStart("nba"), "10/22");
  });

  it("replaces Live fallback in catalog status labels", () => {
    const label = catalogStatusLabel({
      id: "nba",
      label: "NBA",
      region: "USA",
      sport: "basketball",
      status: "live",
      leagueId: "nba",
      href: "/nba",
      sort: 1,
    });
    assert.equal(label, "10/22");
    assert.notEqual(label, "Live");
  });
});

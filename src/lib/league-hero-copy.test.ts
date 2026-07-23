import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leagueThirdTeamTagline } from "@/lib/league-hero-copy";

describe("leagueThirdTeamTagline", () => {
  it("uses court for basketball leagues", () => {
    assert.match(leagueThirdTeamTagline("nba"), /on the court\.$/);
    assert.match(leagueThirdTeamTagline("wnba"), /on the court\.$/);
    assert.match(leagueThirdTeamTagline("cbb"), /on the court\.$/);
  });

  it("uses rink for NHL", () => {
    assert.match(leagueThirdTeamTagline("nhl"), /on the rink\.$/);
  });

  it("uses field for football and soccer leagues", () => {
    assert.match(leagueThirdTeamTagline("nfl"), /on the field\.$/);
    assert.match(leagueThirdTeamTagline("cfb"), /on the field\.$/);
    assert.match(leagueThirdTeamTagline("epl"), /on the field\.$/);
    assert.match(leagueThirdTeamTagline("laliga"), /on the field\.$/);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { footerLeagueForPath } from "@/lib/footer-league";

describe("footerLeagueForPath", () => {
  it("maps league routes to the matching footer league", () => {
    assert.equal(footerLeagueForPath("/"), "overview");
    assert.equal(footerLeagueForPath("/overview"), "overview");
    assert.equal(footerLeagueForPath("/refs"), "nba");
    assert.equal(footerLeagueForPath("/research"), "nba");
    assert.equal(footerLeagueForPath("/nfl/research"), "nfl");
    assert.equal(footerLeagueForPath("/nhl/matrix"), "nhl");
    assert.equal(footerLeagueForPath("/epl/teams/ARS"), "epl");
    assert.equal(footerLeagueForPath("/laliga/rankings"), "laliga");
    assert.equal(footerLeagueForPath("/cbb/teams"), "cbb");
    assert.equal(footerLeagueForPath("/cfb/teams/MIA"), "cfb");
    assert.equal(footerLeagueForPath("/ncaa/integrity-audit"), "cbb");
  });
});

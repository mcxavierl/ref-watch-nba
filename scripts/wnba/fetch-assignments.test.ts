import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crewMatchupKey } from "./lib/crew-matchup";

describe("WNBA assignment crew matching", () => {
  it("maps official city names to canonical ESPN abbr keys", () => {
    assert.equal(crewMatchupKey("New York", "Dallas"), "NYL@DAL");
    assert.equal(crewMatchupKey("Las Vegas", "Toronto"), "LVA@TOR");
    assert.equal(crewMatchupKey("Washington", "Golden State"), "WAS@GSV");
    assert.equal(crewMatchupKey("Minnesota", "Seattle"), "MIN@SEA");
  });

  it("accepts canonical abbreviations from ESPN scoreboard", () => {
    assert.equal(crewMatchupKey("NYL", "DAL"), "NYL@DAL");
    assert.equal(crewMatchupKey("WSH", "GS"), "WAS@GSV");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLocalOnlyLeague,
  shouldRedirectLocalOnlyLeagueForAccess,
} from "@/lib/local-only-leagues";

describe("local-only leagues", () => {
  it("treats WNBA as local-only", () => {
    assert.equal(isLocalOnlyLeague("wnba"), true);
    assert.equal(isLocalOnlyLeague("nba"), false);
  });

  it("redirects WNBA paths only when preview access is disabled", () => {
    assert.equal(shouldRedirectLocalOnlyLeagueForAccess("/wnba", false), true);
    assert.equal(shouldRedirectLocalOnlyLeagueForAccess("/wnba/teams", false), true);
    assert.equal(shouldRedirectLocalOnlyLeagueForAccess("/wnba", true), false);
    assert.equal(shouldRedirectLocalOnlyLeagueForAccess("/mlb", false), false);
  });
});

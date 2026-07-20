import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLocalOnlyLeague,
  shouldRedirectLocalOnlyLeagueForAccess,
} from "@/lib/local-only-leagues";

describe("local-only leagues", () => {
  it("has no production-gated league routes by default", () => {
    assert.equal(isLocalOnlyLeague("wnba"), false);
    assert.equal(isLocalOnlyLeague("nba"), false);
  });

  it("does not redirect league paths when the local-only list is empty", () => {
    assert.equal(shouldRedirectLocalOnlyLeagueForAccess("/wnba", false), false);
    assert.equal(shouldRedirectLocalOnlyLeagueForAccess("/wnba/teams", false), false);
    assert.equal(shouldRedirectLocalOnlyLeagueForAccess("/mlb", false), false);
  });
});

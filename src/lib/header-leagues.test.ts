import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getHeaderLeagueIds,
  shouldRedirectHiddenLeague,
} from "@/lib/header-leagues";
import { HEADER_LEAGUE_IDS } from "@/lib/leagues";
import { PRODUCTION_LIVE_HEADER_LEAGUE_IDS } from "@/lib/live-header-leagues.generated";

describe("header league switcher", () => {
  it("includes launched CBB and keeps CFB out of dev and production lists", () => {
    const headerIds = getHeaderLeagueIds();

    assert.ok(headerIds.includes("cbb"), "cbb should appear in header");
    assert.ok(!headerIds.includes("cfb"), "cfb should stay hidden");

    for (const leagueId of HEADER_LEAGUE_IDS) {
      assert.ok(headerIds.includes(leagueId), `${leagueId} should stay in header`);
    }

    for (const leagueId of PRODUCTION_LIVE_HEADER_LEAGUE_IDS) {
      assert.ok(headerIds.includes(leagueId), `${leagueId} should stay in header`);
    }
  });

  it("redirects unshipped league prefixes to home", () => {
    assert.equal(shouldRedirectHiddenLeague("/wnba"), true);
    assert.equal(shouldRedirectHiddenLeague("/wnba/rankings"), true);
    assert.equal(shouldRedirectHiddenLeague("/mlb"), true);
    assert.equal(shouldRedirectHiddenLeague("/mlb/teams"), true);
    assert.equal(shouldRedirectHiddenLeague("/nba"), false);
    assert.equal(shouldRedirectHiddenLeague("/cbb/rankings"), false);
  });
});

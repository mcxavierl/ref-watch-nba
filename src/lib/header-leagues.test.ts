import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getHeaderLeagueIds } from "@/lib/header-leagues";
import { HEADER_LEAGUE_IDS } from "@/lib/leagues";
import { PRODUCTION_LIVE_HEADER_LEAGUE_IDS } from "@/lib/live-header-leagues.generated";

describe("header league switcher", () => {
  it("never includes college leagues in dev or production lists", () => {
    const headerIds = getHeaderLeagueIds();

    assert.ok(!headerIds.includes("cbb"));
    assert.ok(!headerIds.includes("cfb"));

    for (const leagueId of HEADER_LEAGUE_IDS) {
      assert.ok(headerIds.includes(leagueId), `${leagueId} should stay in header`);
    }

    for (const leagueId of PRODUCTION_LIVE_HEADER_LEAGUE_IDS) {
      assert.ok(headerIds.includes(leagueId), `${leagueId} should stay in header`);
    }
  });
});

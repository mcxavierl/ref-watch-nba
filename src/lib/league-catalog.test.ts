import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogLiveCompetitionEntries } from "@/lib/league-catalog";
import { PRIMARY_LIVE_LEAGUE_IDS } from "@/lib/verified-live-leagues";

describe("league catalog live competitions", () => {
  it("includes CBB and CFB in live competitions with no limited tier", () => {
    const live = catalogLiveCompetitionEntries();
    const liveIds = live.map((entry) => entry.leagueId);

    assert.ok(liveIds.includes("cbb"));
    assert.ok(liveIds.includes("cfb"));
    assert.ok(liveIds.includes("nba"));

    for (const leagueId of PRIMARY_LIVE_LEAGUE_IDS) {
      assert.ok(liveIds.includes(leagueId), `${leagueId} should appear in live catalog`);
    }
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogComingSoonEntries,
  catalogLiveCompetitionEntries,
  catalogStatusLabel,
} from "@/lib/league-catalog";
import { PRO_ONLY_LIVE_LEAGUE_IDS } from "@/lib/verified-live-leagues";

describe("league catalog live competitions", () => {
  it("lists pro live competitions and launched NCAA hubs", () => {
    const live = catalogLiveCompetitionEntries();
    const liveIds = live.map((entry) => entry.leagueId);

    assert.ok(liveIds.includes("cbb"));
    assert.ok(!liveIds.includes("cfb"));
    assert.ok(liveIds.includes("nba"));

    for (const leagueId of PRO_ONLY_LIVE_LEAGUE_IDS) {
      assert.ok(liveIds.includes(leagueId), `${leagueId} should appear in live catalog`);
    }
  });

  it("shows unlaunched NCAA football as coming soon without live stats", () => {
    const soon = catalogComingSoonEntries();
    const cbb = soon.find((entry) => entry.id === "cbb");
    const cfb = soon.find((entry) => entry.id === "cfb");

    assert.equal(cbb, undefined);
    assert.ok(cfb);
    assert.equal(cfb.leagueId, undefined);
    assert.equal(catalogStatusLabel(cfb), "Coming Soon");
  });
});

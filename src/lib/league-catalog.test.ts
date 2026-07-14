import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogLiveCompetitionEntries,
  catalogNcaaCoverageEntries,
} from "@/lib/league-catalog";
import { isNcaaConferenceGatedLive } from "@/lib/verified-live-leagues";

describe("league catalog NCAA tiers", () => {
  it("places live CBB in live competitions, not limited coverage", () => {
    const live = catalogLiveCompetitionEntries();
    const ncaaLimited = catalogNcaaCoverageEntries();

    if (isNcaaConferenceGatedLive("cbb")) {
      assert.ok(live.some((entry) => entry.leagueId === "cbb"));
      assert.equal(ncaaLimited.some((entry) => entry.leagueId === "cbb"), false);
    }

    for (const entry of live) {
      if (entry.leagueId === "cbb" || entry.leagueId === "cfb") {
        assert.equal(isNcaaConferenceGatedLive(entry.leagueId), true);
      }
    }

    for (const entry of ncaaLimited) {
      assert.ok(entry.leagueId === "cbb" || entry.leagueId === "cfb");
      assert.equal(isNcaaConferenceGatedLive(entry.leagueId), false);
    }

    const liveIds = new Set(live.map((e) => e.id));
    const limitedIds = new Set(ncaaLimited.map((e) => e.id));
    for (const id of limitedIds) {
      assert.equal(liveIds.has(id), false, `${id} should not appear in both tiers`);
    }
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  loadLeagueHubUpcomingSlateFromSnapshot,
  loadOverviewSnapshot,
} from "@/lib/overview-snapshot-data";
import { LEAGUE_UPCOMING_SLATE_LIMIT } from "@/lib/overview-upcoming-slate";

describe("overview snapshot data", () => {
  it("loads league hub upcoming slates from bundled snapshot groups", () => {
    const snapshot = loadOverviewSnapshot();
    const wnbaGroup = snapshot.upcomingSlate.leagueGroups?.find(
      (group) => group.leagueId === "wnba",
    );

    if (!wnbaGroup || wnbaGroup.games.length === 0) {
      return;
    }

    const slate = loadLeagueHubUpcomingSlateFromSnapshot("wnba");

    assert.equal(slate.inSeason, true);
    assert.ok(slate.leagueGroup);
    assert.equal(slate.leagueGroup?.leagueId, "wnba");
    assert.ok(slate.leagueGroup.games.length > 0);
    assert.ok(slate.leagueGroup.games.length <= LEAGUE_UPCOMING_SLATE_LIMIT);
    assert.equal(slate.leagueGroup.games[0]?.gameId, wnbaGroup.games[0]?.gameId);
  });
});

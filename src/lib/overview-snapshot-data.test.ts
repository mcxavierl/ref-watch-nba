import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  loadLeagueHubUpcomingSlateFromSnapshot,
  loadOverviewSnapshot,
} from "@/lib/overview-snapshot-data";
import {
  buildHistoricalMatchupBaseline,
  buildSlateOutlookSummary,
} from "@/lib/slate-intelligence";
import { isWnbaAllStarMatchup } from "@/lib/wnba/teams";

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
    assert.equal(slate.leagueGroup.games.length, wnbaGroup.games.length);
    assert.equal(slate.leagueGroup.games[0]?.gameId, wnbaGroup.games[0]?.gameId);
  });

  it("keeps pending slate cards off empty head-to-head fallback except All-Star events", () => {
    const snapshot = loadOverviewSnapshot();
    const games = snapshot.upcomingSlate.games ?? [];
    if (games.length === 0) return;

    for (const game of games) {
      const baseline = buildHistoricalMatchupBaseline(game);
      if (game.leagueId === "wnba" && isWnbaAllStarMatchup(game.awayTeam, game.homeTeam)) {
        assert.equal(baseline.title, "WNBA ALL-STAR GAME");
        assert.equal(baseline.isEmptyFallback, false);
        continue;
      }

      assert.equal(
        baseline.isEmptyFallback,
        false,
        `${game.leagueId} ${game.matchup} should surface matchup context`,
      );
    }
  });

  it("does not show zero percent confidence when every game is pending crew", () => {
    const snapshot = loadOverviewSnapshot();
    const games = snapshot.upcomingSlate.games ?? [];
    if (games.length === 0) return;

    const outlook = buildSlateOutlookSummary(games);
    if (outlook.pendingCrewCount === games.length) {
      assert.equal(outlook.avgConfidencePct, null);
    }
  });
});

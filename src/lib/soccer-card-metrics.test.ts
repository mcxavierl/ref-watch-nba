import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCrossLeagueOverview } from "@/lib/cross-league-overview";
import { getRefStats as getEplRefStats } from "@/lib/epl/data";
import {
  enrichSoccerCardMeta,
  leagueCardsPerGame,
} from "@/lib/soccer-card-metrics";

describe("soccer card metrics", () => {
  it("derives EPL cards per game when meta omits league card averages", () => {
    const stats = getEplRefStats();
    const cards = leagueCardsPerGame(stats);
    assert.ok(cards > 3, `expected EPL cards/g > 3, got ${cards}`);

    const enriched = enrichSoccerCardMeta({
      ...stats,
      meta: { ...stats.meta, leagueAvgYellowCards: undefined, leagueAvgRedCards: undefined },
    });
    assert.ok(
      (enriched.meta.leagueAvgYellowCards ?? 0) > 0,
      "yellow card meta backfilled",
    );
    assert.ok(
      (enriched.meta.leagueAvgRedCards ?? 0) > 0,
      "red card meta backfilled",
    );
  });

  it("feeds EPL quick-list whistle preview from derived card rates", () => {
    const overview = buildCrossLeagueOverview(20);
    const epl = overview.leagueCards.find((card) => card.leagueId === "epl");
    assert.ok(epl, "EPL overview card");
    assert.ok(epl.whistlePerGame > 3, `EPL whistlePerGame ${epl.whistlePerGame}`);
  });

  it("reports exact score metrics without estimated flags on all league cards", () => {
    const overview = buildCrossLeagueOverview(20);
    for (const card of overview.leagueCards) {
      assert.equal(
        card.scoreEstimated,
        false,
        `${card.leagueId} scoreEstimated should be false`,
      );
    }
  });

  it("precomputes homepage standout split cards in the overview snapshot", () => {
    const overview = buildCrossLeagueOverview(20);
    assert.ok(Array.isArray(overview.standoutSplitCards));
    assert.ok(overview.standoutSplitCards.length > 0);
    for (const card of overview.standoutSplitCards) {
      assert.equal(card.kind, "matrix-edge");
    }
  });
});

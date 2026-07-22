import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getActiveLeaguesBySeason,
  getOverviewHubLeagueOrder,
  isLeagueInSeasonWindow,
} from "@/lib/active-leagues-by-season";

describe("active-leagues-by-season", () => {
  it("marks WNBA live in mid-July", () => {
    const july = new Date("2026-07-22T12:00:00.000Z");
    assert.equal(isLeagueInSeasonWindow("wnba", july), true);
    assert.equal(isLeagueInSeasonWindow("nba", july), false);
  });

  it("ranks live leagues ahead of offseason leagues", () => {
    const july = new Date("2026-07-22T12:00:00.000Z");
    const ordered = getActiveLeaguesBySeason(july);
    const firstLiveIndex = ordered.findIndex((entry) => entry.isLive);
    const firstOffseasonIndex = ordered.findIndex((entry) => !entry.isLive);
    if (firstLiveIndex >= 0 && firstOffseasonIndex >= 0) {
      assert.ok(firstLiveIndex < firstOffseasonIndex);
    }
    assert.equal(ordered[0]?.leagueId, "wnba");
  });

  it("returns hub order with college last", () => {
    const order = getOverviewHubLeagueOrder(new Date("2026-07-22T12:00:00.000Z"));
    assert.equal(order.at(-1), "cbb");
    assert.ok(order.includes("wnba"));
  });
});

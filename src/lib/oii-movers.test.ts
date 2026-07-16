import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOiiMoversSnapshot,
  cutoffDateForOiiMovers,
  computeRefOiiMoverDelta,
  gamesWithinOiiMoversWindow,
  resolveOiiMoversAsOfDate,
} from "@/lib/oii-movers";
import type { RefGameRecord, RefProfile } from "@/lib/types";

function game(
  date: string,
  totalFouls: number,
  id = date,
): RefGameRecord {
  return {
    gameId: id,
    date,
    season: "2025-26",
    homeTeam: "BOS",
    awayTeam: "NYK",
    totalPoints: 220,
    totalFouls,
    overHit: true,
    raptorsInvolved: false,
  };
}

function refProfile(recentGames: RefGameRecord[], games = 40): RefProfile {
  return {
    slug: "test-ref",
    name: "Test Ref",
    number: 1,
    games,
    avgTotalPoints: 220,
    overRate: 0.5,
    avgFouls: 40,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2025-26"],
    recentGames,
  };
}

describe("OII movers", () => {
  it("resolves as-of date from the latest logged game", () => {
    const asOf = resolveOiiMoversAsOfDate([
      refProfile([game("2026-04-01", 40), game("2026-04-08", 42)]),
    ]);
    assert.equal(asOf.toISOString().slice(0, 10), "2026-04-08");
  });

  it("filters games inside the movers window", () => {
    const cutoff = cutoffDateForOiiMovers(new Date("2026-04-10T12:00:00Z"));
    assert.equal(cutoff, "2026-04-03");
    const recent = gamesWithinOiiMoversWindow(
      [game("2026-04-02", 40), game("2026-04-08", 44)],
      cutoff,
    );
    assert.equal(recent.length, 1);
    assert.equal(recent[0]?.date, "2026-04-08");
  });

  it("computes a positive delta when recent games raise volatility", () => {
    const stable = [40, 41, 40, 41, 40, 41, 40, 41, 40, 41].map((f, i) =>
      game(`2026-03-${String(i + 1).padStart(2, "0")}`, f),
    );
    const volatileRecent = [
      game("2026-04-08", 58),
      game("2026-04-07", 24),
      game("2026-04-06", 52),
      ...stable,
    ];
    const profile = refProfile(volatileRecent);
    const delta = computeRefOiiMoverDelta(profile, 41, "2026-04-03");
    assert.ok(delta);
    assert.ok(delta.delta > 0);
    assert.ok(delta.currentScore >= delta.priorScore);
  });

  it("buildOiiMoversSnapshot returns at most three movers", () => {
    const snapshot = buildOiiMoversSnapshot(3);
    assert.ok(snapshot.movers.length <= 3);
    assert.equal(snapshot.windowDays, 7);
    assert.ok(snapshot.asOfDate.length > 0);
  });
});

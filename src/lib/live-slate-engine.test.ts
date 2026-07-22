import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareLiveSlatePriority,
  getLiveSlateGames,
} from "@/lib/live-slate-engine";
import { buildOverviewUpcomingSlate } from "@/lib/overview-upcoming-slate";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import {
  isPublishedSlateGameVisible,
  isWithinLiveSlateWindow,
  LIVE_SLATE_LOOKAHEAD_MS,
  LIVE_SLATE_LOOKBACK_MS,
  resolveGameTimestampMs,
  selectHomepageLiveSlateGames,
  selectPublishedHomepageSlateGames,
  slateRotateAtMs,
} from "@/lib/overview-slate-shared";
import { slateHasLiveGames } from "@/lib/use-live-slate";

function entry(
  overrides: Partial<OverviewSlateEntry> & Pick<OverviewSlateEntry, "gameId" | "status">,
): OverviewSlateEntry {
  return {
    leagueId: "wnba",
    leagueLabel: "WNBA",
    leagueShortLabel: "WNBA",
    href: "/wnba",
    matchup: "MIN @ SEA",
    awayTeam: "MIN",
    homeTeam: "SEA",
    crewCount: 0,
    ...overrides,
  };
}

describe("live-slate-engine", () => {
  const now = new Date("2026-07-22T18:00:00.000Z");
  const nowMs = now.getTime();

  it("uses centralized rolling window constants (NOW-relative 6h/30h)", () => {
    assert.equal(LIVE_SLATE_LOOKBACK_MS, 6 * 60 * 60 * 1000);
    assert.equal(LIVE_SLATE_LOOKAHEAD_MS, 30 * 60 * 60 * 1000);
  });

  it("resolves kickoff timestamps from slateStartAt", () => {
    assert.equal(
      resolveGameTimestampMs({
        slateStartAt: "2026-07-22T19:00:00.000Z",
        slateDate: "2026-07-22",
      }),
      Date.parse("2026-07-22T19:00:00.000Z"),
    );
  });

  it("includes upcoming games within the next 30 hours", () => {
    const upcoming = entry({
      gameId: "soon",
      status: "scheduled",
      slateStartAt: new Date(nowMs + 2 * 60 * 60 * 1000).toISOString(),
    });
    assert.equal(isWithinLiveSlateWindow(upcoming, nowMs), true);
  });

  it("excludes upcoming games beyond the 30-hour lookahead", () => {
    const far = entry({
      gameId: "far",
      status: "scheduled",
      slateStartAt: new Date(nowMs + LIVE_SLATE_LOOKAHEAD_MS + 60_000).toISOString(),
    });
    assert.equal(isWithinLiveSlateWindow(far, nowMs), false);
  });

  it("includes live games regardless of kickoff time", () => {
    const live = entry({
      gameId: "live",
      status: "live",
      gamePhase: "live",
      slateStartAt: new Date(nowMs - 5 * 60 * 60 * 1000).toISOString(),
    });
    assert.equal(isWithinLiveSlateWindow(live, nowMs), true);
  });

  it("includes finals from the last 6 hours only", () => {
    const recentFinal = entry({
      gameId: "final-recent",
      status: "final",
      gamePhase: "final",
      slateStartAt: new Date(nowMs - 3 * 60 * 60 * 1000).toISOString(),
    });
    const oldFinal = entry({
      gameId: "final-old",
      status: "final",
      gamePhase: "final",
      slateStartAt: new Date(nowMs - LIVE_SLATE_LOOKBACK_MS - 60_000).toISOString(),
    });

    assert.equal(isWithinLiveSlateWindow(recentFinal, nowMs), true);
    assert.equal(isWithinLiveSlateWindow(oldFinal, nowMs), false);
  });

  it("orders live games before upcoming and final games", () => {
    const games = [
      entry({ gameId: "final", status: "final", slateStartAt: "2026-07-22T12:00:00.000Z" }),
      entry({ gameId: "upcoming", status: "scheduled", slateStartAt: "2026-07-22T20:00:00.000Z" }),
      entry({ gameId: "live", status: "live", slateStartAt: "2026-07-22T17:00:00.000Z" }),
    ].sort(compareLiveSlatePriority);

    assert.deepEqual(
      games.map((game) => game.gameId),
      ["live", "upcoming", "final"],
    );
  });

  it("surfaces upcoming scheduled matchups when nothing is in progress", () => {
    const upcoming = [
      entry({
        gameId: "soon-1",
        status: "scheduled",
        slateStartAt: new Date(nowMs + 2 * 60 * 60 * 1000).toISOString(),
      }),
      entry({
        gameId: "soon-2",
        status: "scheduled",
        slateStartAt: new Date(nowMs + 4 * 60 * 60 * 1000).toISOString(),
      }),
    ];
    const selected = selectHomepageLiveSlateGames(upcoming, now, 9);
    assert.deepEqual(
      selected.map((game) => game.gameId),
      ["soon-1", "soon-2"],
    );
  });

  it("expands into upcoming days when the 6-hour lookback has fewer than nine games", () => {
    const near = entry({
      gameId: "near",
      status: "scheduled",
      slateStartAt: new Date(nowMs + 2 * 60 * 60 * 1000).toISOString(),
    });
    const far = entry({
      gameId: "far",
      status: "scheduled",
      slateStartAt: new Date(nowMs + 5 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const selected = selectPublishedHomepageSlateGames([near, far], now, 9);
    assert.deepEqual(
      selected.map((game) => game.gameId),
      ["near", "far"],
    );
  });

  it("returns nine published homepage matchups from assignments", () => {
    const slate = buildOverviewUpcomingSlate();
    assert.equal(slate.games.length, 9);
    const engineSlate = getLiveSlateGames({ now });
    assert.equal(engineSlate.games.length, 9);
  });

  it("rotates published slate games after noon Eastern the next day", () => {
    const game = entry({
      gameId: "rotate",
      status: "scheduled",
      slateDate: "2026-07-21",
    });
    const beforeRotate = new Date(slateRotateAtMs("2026-07-21") - 60_000);
    const afterRotate = new Date(slateRotateAtMs("2026-07-21") + 60_000);
    assert.equal(isPublishedSlateGameVisible(game, beforeRotate.getTime()), true);
    assert.equal(isPublishedSlateGameVisible(game, afterRotate.getTime()), false);
    const selected = selectPublishedHomepageSlateGames([game], beforeRotate, 9);
    assert.equal(selected.length, 1);
    assert.equal(selectPublishedHomepageSlateGames([game], afterRotate, 9).length, 0);
  });

  it("returns every in-window game when allGames is enabled", () => {
    const slate = getLiveSlateGames({ now, allGames: true });
    const capped = getLiveSlateGames({ now });
    assert.ok(slate.games.length >= 1);
    assert.equal(capped.games.length, 9);
  });
});

describe("use-live-slate helpers", () => {
  it("detects live games for adaptive polling", () => {
    assert.equal(
      slateHasLiveGames([
        entry({ gameId: "1", status: "scheduled" }),
        entry({ gameId: "2", status: "live", gamePhase: "live" }),
      ]),
      true,
    );
    assert.equal(
      slateHasLiveGames([entry({ gameId: "1", status: "scheduled" })]),
      false,
    );
  });
});

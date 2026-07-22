import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareLiveSlatePriority,
  getLiveSlateGames,
  isWithinLiveSlateWindow,
  LIVE_SLATE_LOOKAHEAD_MS,
  LIVE_SLATE_LOOKBACK_MS,
  resolveGameTimestampMs,
} from "@/lib/live-slate-engine";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
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

  it("returns every in-window game when allGames is enabled", () => {
    const slate = getLiveSlateGames({ now, allGames: true });
    const capped = getLiveSlateGames({ now });
    assert.ok(slate.games.length >= capped.games.length);
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

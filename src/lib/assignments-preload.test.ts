import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCachedAssignments,
  setCachedAssignments,
} from "@/lib/assignments-preload";
import { getLiveSlateGames } from "@/lib/live-slate-engine";
import type { AssignmentsFile } from "@/lib/types";

const sampleAssignments: AssignmentsFile = {
  lastUpdated: "2026-07-22T14:51:34.794Z",
  date: "2026-07-22",
  source: "official.nba.com",
  games: [
    {
      id: "401857086",
      matchup: "PHO @ LAS",
      awayTeam: "PHO",
      homeTeam: "LAS",
      league: "WNBA",
      slateDate: "2026-07-22",
      slateStartAt: "2026-07-22T19:00Z",
      gameStatus: "STATUS_SCHEDULED",
      awayScore: 0,
      homeScore: 0,
      gameClock: "0.0",
      crew: [{ name: "Roy Gulbeyan", number: 42, role: "crew_chief" }],
    },
  ],
};

describe("assignments-preload", () => {
  it("serves hydrated assignments to the live slate engine", () => {
    setCachedAssignments("wnba", sampleAssignments);
    const slate = getLiveSlateGames({
      now: new Date("2026-07-22T18:00:00.000Z"),
      leagueId: "wnba",
      limit: 9,
    });
    assert.ok(slate.games.length >= 1);
    assert.equal(slate.games[0]?.matchup, "PHO @ LAS");
    assert.equal(getCachedAssignments("wnba")?.games.length, 1);
  });
});

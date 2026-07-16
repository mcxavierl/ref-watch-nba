import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rebuildRefGamesFromLogs } from "./rebuild-ref-games-from-logs";
import type { GameLogFile } from "./game-logs";
import type { RefStatsFile } from "./types";

function makeStats(ref: { slug: string; name: string; number: number; games: number }): RefStatsFile {
  return {
    meta: {
      lastUpdated: "2020-01-01",
      leagueAvgTotal: 200,
      leagueAvgFouls: 40,
      leagueOverBaseline: 200,
      refCount: 1,
      seasons: ["2023-24"],
    },
    refs: [
      {
        slug: ref.slug,
        name: ref.name,
        number: ref.number,
        games: ref.games,
        avgTotalPoints: 200,
        overRate: 0.5,
        avgFouls: 40,
        homeCoverRate: null,
        totalPointsDelta: 0,
        foulsDelta: 0,
        seasons: ["2023-24"],
        recentGames: [],
        teamStats: {},
      },
    ],
    teamSplits: {},
  };
}

describe("rebuildRefGamesFromLogs", () => {
  const duplicateLogs: GameLogFile = {
    meta: { lastUpdated: "2020-01-01" },
    games: [
      {
        gameId: "dup-1",
        date: "2024-01-01",
        season: "2023-24",
        homeTeam: "LAL",
        awayTeam: "BOS",
        homeScore: 110,
        awayScore: 100,
        totalPoints: 210,
        totalFouls: 40,
        closingTotal: 200,
        officials: [{ name: "Scott Foster", number: 48 }],
      },
      {
        gameId: "dup-1",
        date: "2024-01-01",
        season: "2023-24",
        homeTeam: "LAL",
        awayTeam: "BOS",
        homeScore: 110,
        awayScore: 100,
        totalPoints: 210,
        totalFouls: 40,
        closingTotal: 200,
        officials: [{ name: "Scott Foster", number: 48 }],
      },
      {
        gameId: "g2",
        date: "2024-01-02",
        season: "2023-24",
        homeTeam: "LAL",
        awayTeam: "MIA",
        homeScore: 105,
        awayScore: 100,
        totalPoints: 205,
        totalFouls: 38,
        closingTotal: 200,
        officials: [{ name: "Scott Foster", number: 48 }],
      },
    ],
  };

  it("dedupes duplicate game_id rows for slug-keyed leagues", () => {
    const stats = makeStats({
      slug: "scott-foster-48",
      name: "Scott Foster",
      number: 48,
      games: 99,
    });
    const rebuilt = rebuildRefGamesFromLogs(stats, duplicateLogs, {
      useCanonicalKey: false,
      seasons: ["2023-24"],
    });
    assert.equal(rebuilt.refs[0]?.games, 2);
  });

  it("dedupes duplicate game_id rows for canonical-key leagues", () => {
    const stats = makeStats({
      slug: "scott-foster-48",
      name: "Scott Foster",
      number: 48,
      games: 99,
    });
    const rebuilt = rebuildRefGamesFromLogs(stats, duplicateLogs, {
      useCanonicalKey: true,
      seasons: ["2023-24"],
    });
    assert.equal(rebuilt.refs[0]?.games, 2);
  });
});

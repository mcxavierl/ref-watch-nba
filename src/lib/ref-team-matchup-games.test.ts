import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setCachedGameLogs } from "@/lib/game-logs-preload";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import {
  buildRefTeamMatchupPayload,
  listRefTeamMatchupGamesFromEntries,
} from "@/lib/ref-team-matchup-games-core";

const sampleGames = [
  {
    gameId: "g1",
    date: "2024-01-10",
    season: "2023-24",
    league: "NBA" as const,
    homeTeam: "LAL",
    awayTeam: "BOS",
    homeScore: 110,
    awayScore: 105,
    totalPoints: 215,
    totalFouls: 42,
    closingTotal: 220,
    homeSpread: -3,
    lineSource: "external" as const,
    officials: [{ name: "Scott Foster", number: 48, role: "referee" }],
  },
  {
    gameId: "g2",
    date: "2024-02-15",
    season: "2023-24",
    league: "NBA" as const,
    homeTeam: "BOS",
    awayTeam: "LAL",
    homeScore: 98,
    awayScore: 102,
    totalPoints: 200,
    totalFouls: 38,
    closingTotal: 210,
    homeSpread: 2.5,
    lineSource: "external" as const,
    officials: [
      { name: "Scott Foster", number: 48, role: "referee" },
      { name: "Tony Brothers", number: 25, role: "referee" },
    ],
  },
  {
    gameId: "g3",
    date: "2024-03-01",
    season: "2023-24",
    league: "NBA" as const,
    homeTeam: "LAL",
    awayTeam: "GSW",
    homeScore: 115,
    awayScore: 112,
    totalPoints: 227,
    totalFouls: 40,
    closingTotal: 225,
    homeSpread: -1,
    lineSource: "external" as const,
    officials: [{ name: "Tony Brothers", number: 25, role: "referee" }],
  },
] satisfies RuntimeGameLogEntry[];

describe("ref-team-matchup-games", () => {
  it("filters games by ref slug and team", () => {
    setCachedGameLogs("NBA", {
      lastUpdated: "2024-01-01",
      league: "NBA",
      source: "test",
      games: sampleGames,
    });

    const games = listRefTeamMatchupGamesFromEntries(
      sampleGames,
      "scott-foster-48",
      "LAL",
    );
    assert.equal(games.length, 2);
    assert.deepEqual(
      games.map((game) => game.gameId).sort(),
      ["g1", "g2"],
    );
  });

  it("builds a drilldown payload with venue splits and crew partners", () => {
    const payload = buildRefTeamMatchupPayload(
      {
        leagueId: "nba",
        refSlug: "scott-foster-48",
        refName: "Scott Foster",
        teamAbbr: "LAL",
        teamLabel: "the Lakers",
        baselineWinRate: 0.5,
        leagueAvgFouls: 40,
      },
      sampleGames,
    );

    assert.ok(payload);
    assert.equal(payload?.games.length, 2);
    assert.equal(payload?.wins, 2);
    assert.equal(payload?.losses, 0);
    assert.equal(payload?.homeSplit.wins, 1);
    assert.equal(payload?.awaySplit.wins, 1);
    assert.equal(payload?.crewPartners.length, 1);
    assert.equal(payload?.crewPartners[0]?.name, "Tony Brothers");
  });
});

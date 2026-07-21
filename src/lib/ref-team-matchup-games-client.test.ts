import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setCachedGameLogs } from "@/lib/game-logs-preload";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import {
  buildClientRefTeamMatchupPayload,
  fetchRefTeamMatchupPayload,
} from "@/lib/ref-team-matchup-games-client";

const cbbDukeGames = [
  {
    gameId: "401259835",
    date: "2020-11-28",
    season: "2020-21",
    league: "CBB" as const,
    homeTeam: "DUKE",
    awayTeam: "COPP",
    homeScore: 81,
    awayScore: 56,
    totalPoints: 137,
    totalFouls: 34,
    closingTotal: 140,
    homeSpread: -25,
    lineSource: "external" as const,
    officials: [
      { name: "Mark Schnur", number: 1, role: "referee" },
      { name: "Roger Ayers", number: 2, role: "referee" },
    ],
  },
  {
    gameId: "401260206",
    date: "2021-01-09",
    season: "2020-21",
    league: "CBB" as const,
    homeTeam: "DUKE",
    awayTeam: "WAKE",
    homeScore: 79,
    awayScore: 65,
    totalPoints: 144,
    totalFouls: 36,
    closingTotal: 145,
    homeSpread: -8,
    lineSource: "external" as const,
    officials: [
      { name: "Mark Schnur", number: 1, role: "referee" },
      { name: "Clarence Armstrong", number: 9, role: "referee" },
    ],
  },
] satisfies RuntimeGameLogEntry[];

describe("ref-team-matchup-games-client", () => {
  it("builds payload from hydrated globals when available", () => {
    setCachedGameLogs("CBB", {
      lastUpdated: "2024-01-01",
      league: "CBB",
      source: "test",
      games: cbbDukeGames,
    });

    const payload = buildClientRefTeamMatchupPayload({
      leagueId: "cbb",
      refSlug: "mark-schnur-1",
      refName: "Mark Schnur",
      teamAbbr: "DUKE",
      teamLabel: "Duke Blue Devils",
      baselineWinRate: 0.6,
    });

    assert.ok(payload);
    assert.equal(payload?.games.length, 2);
    assert.equal(payload?.wins, 2);
    assert.equal(payload?.losses, 0);
  });

  it("fetchRefTeamMatchupPayload uses hydrated globals without fetch", async () => {
    setCachedGameLogs("CBB", {
      lastUpdated: "2024-01-01",
      league: "CBB",
      source: "test",
      games: cbbDukeGames,
    });

    const payload = await fetchRefTeamMatchupPayload({
      leagueId: "cbb",
      refSlug: "mark-schnur-1",
      refName: "Mark Schnur",
      teamAbbr: "DUKE",
      teamLabel: "Duke Blue Devils",
      baselineWinRate: 0.6,
    });

    assert.ok(payload);
    assert.equal(payload?.games.length, 2);
    assert.equal(payload?.teamAbbr, "DUKE");
  });
});

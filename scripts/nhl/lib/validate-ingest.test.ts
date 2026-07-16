import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GameLogEntry } from "../../lib/game-logs";
import { validateNhlGameLogs } from "./validate-ingest";

function sampleGame(overrides: Partial<GameLogEntry> = {}): GameLogEntry {
  return {
    gameId: "2016020001",
    date: "2016-10-12",
    season: "2016-17",
    league: "NHL",
    homeTeam: "OTT",
    awayTeam: "TOR",
    homeScore: 5,
    awayScore: 4,
    totalPoints: 9,
    totalFouls: 26,
    homeMinors: 5,
    awayMinors: 3,
    wentToOvertime: true,
    closingTotal: 8.5,
    homeSpread: -0.5,
    lineSource: "synthetic",
    officials: [
      { name: "Wes McCauley", number: 4, role: "referee" },
      { name: "Francis Charron", number: 6, role: "referee" },
      { name: "Matt MacPherson", number: 83, role: "linesman" },
      { name: "Tony Sericolo", number: 0, role: "linesman" },
    ],
    ...overrides,
  };
}

describe("validateNhlGameLogs", () => {
  it("passes clean sample logs", () => {
    const games = Array.from({ length: 10001 }, (_, i) =>
      sampleGame({ gameId: String(2016020000 + i) }),
    );
    const summary = validateNhlGameLogs(games, { minGames: 10000 });
    assert.equal(summary.passed, true);
    assert.equal(summary.duplicateGameIds, 0);
  });

  it("fails on duplicate game_id", () => {
    const games = [
      sampleGame({ gameId: "dup" }),
      sampleGame({ gameId: "dup" }),
      ...Array.from({ length: 9999 }, (_, i) =>
        sampleGame({ gameId: String(2016021000 + i) }),
      ),
    ];
    const summary = validateNhlGameLogs(games, { minGames: 10000 });
    assert.equal(summary.passed, false);
    assert.ok(summary.duplicateGameIds > 0);
  });

  it("fails when officials are missing", () => {
    const games = Array.from({ length: 10001 }, (_, i) =>
      sampleGame({
        gameId: String(2016022000 + i),
        officials: i === 0 ? [] : sampleGame().officials,
      }),
    );
    const summary = validateNhlGameLogs(games, { minGames: 10000 });
    assert.equal(summary.passed, false);
    assert.equal(summary.missingOfficials, 1);
  });
});

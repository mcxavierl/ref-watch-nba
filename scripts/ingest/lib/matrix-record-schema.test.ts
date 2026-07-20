import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expandGameToMatrixRecords,
  filterGamesForMatrixGeneration,
  validateMatrixRecords,
} from "./matrix-record-schema";
import type { GameLogEntry } from "../../lib/game-logs";

function makeGame(overrides: Partial<GameLogEntry> = {}): GameLogEntry {
  return {
    gameId: "game-1",
    date: "2026-01-15",
    season: "2025-26",
    league: "NBA",
    homeTeam: "BOS",
    awayTeam: "NYK",
    homeScore: 110,
    awayScore: 104,
    totalPoints: 214,
    totalFouls: 42,
    closingTotal: 220,
    homeSpread: -4.5,
    lineSource: "external",
    officials: [{ name: "Scott Foster", number: 48, role: "referee" }],
    ...overrides,
  };
}

describe("matrix-record-schema", () => {
  it("accepts valid officiating records", () => {
    const records = expandGameToMatrixRecords(makeGame(), "nba");
    const result = validateMatrixRecords(records);
    assert.equal(result.invalid.length, 0);
    assert.equal(result.valid.length, 1);
    assert.equal(result.valid[0]?.category, "game-officiating");
    assert.equal(result.valid[0]?.officialId, "scott-foster-48");
  });

  it("rejects records missing required fields", () => {
    const result = validateMatrixRecords([
      { category: "", officialId: "ref-1", gameTimestamp: "2026-01-15T00:00:00.000Z" },
    ]);
    assert.equal(result.valid.length, 0);
    assert.equal(result.invalid.length, 1);
  });

  it("skips games with no officials without treating them as dirty data", () => {
    const clean = makeGame();
    const incomplete = makeGame({
      gameId: "game-incomplete",
      officials: [],
    });

    const filtered = filterGamesForMatrixGeneration([clean, incomplete], "nba");
    assert.equal(filtered.games.length, 1);
    assert.equal(filtered.skippedIncomplete, 1);
    assert.equal(filtered.excludedGames, 0);
    assert.equal(filtered.games[0]?.gameId, "game-1");
  });

  it("excludes games with invalid matrix records from generation", () => {
    const clean = makeGame();
    const dirty = makeGame({
      gameId: "game-dirty",
      date: "",
      officials: [{ name: "Bad Date", number: 1, role: "referee" }],
    });

    const filtered = filterGamesForMatrixGeneration([clean, dirty], "nba");
    assert.equal(filtered.games.length, 1);
    assert.equal(filtered.excludedGames, 1);
    assert.equal(filtered.games[0]?.gameId, "game-1");
  });
});

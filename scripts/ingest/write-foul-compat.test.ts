import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FoulCategory } from "../../src/lib/types/foul-categories";
import type { MergedGame } from "./merge-games";
import { toNdjsonGame } from "./write";

const baseGame: MergedGame = {
  gameId: "0022500001",
  date: "2025-10-21",
  season: "2025-26",
  homeTeam: "BOS",
  awayTeam: "NYK",
  homeScore: 110,
  awayScore: 105,
  totalPoints: 215,
  totalFouls: 38,
  officials: [{ name: "Scott Foster", number: 48 }],
  officialsSource: "nba-stats-api",
  bbrGameId: "202510210BOS",
  isPlayoff: false,
};

describe("write ndjson foul backward compatibility", () => {
  it("leaves legacy game rows unchanged when fouls are absent", () => {
    const row = toNdjsonGame(baseGame);
    assert.equal("fouls" in row, false);
    assert.equal(row.gameId, baseGame.gameId);
    assert.equal(row.league, "NBA");
    assert.equal(row.totalFouls, 38);
  });

  it("adds optional fouls array without altering existing top-level fields", () => {
    const row = toNdjsonGame({
      ...baseGame,
      fouls: [{ foulName: "Shooting Foul" }],
    });

    assert.ok(Array.isArray(row.fouls));
    assert.equal(row.fouls?.length, 1);
    assert.equal(row.fouls?.[0]?.category, FoulCategory.SUBJECTIVE);
    assert.equal(row.gameId, baseGame.gameId);
    assert.equal(row.totalFouls, 38);
  });
});

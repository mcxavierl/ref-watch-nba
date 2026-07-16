import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertNflIngestValid, validateNflGameLogs } from "./validate-ingest";

const baseGame = {
  gameId: "1",
  date: "2024-09-08",
  season: "2024-25",
  league: "NFL" as const,
  homeTeam: "KC",
  awayTeam: "BAL",
  homeScore: 27,
  awayScore: 20,
  totalPoints: 47,
  totalFouls: 12,
  homeFlags: 6,
  awayFlags: 6,
  homePenaltyYards: 55,
  awayPenaltyYards: 48,
  closingTotal: 46.5,
  homeSpread: -3,
  lineSource: "external" as const,
  officials: [{ name: "Shawn Hochuli", number: 83, role: "referee" as const }],
};

describe("validateNflGameLogs", () => {
  it("passes a valid minimal batch", () => {
    const results = validateNflGameLogs(
      Array.from({ length: 10 }, (_, i) => ({
        ...baseGame,
        gameId: String(i),
      })),
      { minGames: 5 },
    );
    assert.ok(results.every((r) => r.passed));
  });

  it("fails on duplicate game_id", () => {
    const results = validateNflGameLogs(
      [baseGame, { ...baseGame }],
      { minGames: 1 },
    );
    const dup = results.find((r) => r.check === "distinct-game-id");
    assert.equal(dup?.passed, false);
  });

  it("fails when officials are missing", () => {
    const results = validateNflGameLogs(
      [{ ...baseGame, officials: [] }],
      { minGames: 1, minOfficialCoveragePct: 100 },
    );
    const cov = results.find((r) => r.check === "officials-coverage");
    assert.equal(cov?.passed, false);
  });

  it("assertNflIngestValid throws on failure", () => {
    assert.throws(
      () => assertNflIngestValid([{ ...baseGame, officials: [] }], { minGames: 1 }),
      /NFL ingest validation failed/,
    );
  });
});

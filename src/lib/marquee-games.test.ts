import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyMarqueeGame,
  isMarqueeGame,
} from "@/lib/marquee-games";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";

function baseGame(overrides: Partial<RuntimeGameLogEntry>): RuntimeGameLogEntry {
  return {
    gameId: "g1",
    date: "2024-09-12",
    season: "2024-25",
    league: "NFL",
    homeTeam: "DAL",
    awayTeam: "PHI",
    homeScore: 24,
    awayScore: 21,
    totalPoints: 45,
    totalFouls: 12,
    closingTotal: 44,
    homeSpread: -2.5,
    lineSource: "synthetic",
    officials: [{ name: "Test Ref", number: 42, role: "referee" }],
    ...overrides,
  };
}

describe("classifyMarqueeGame", () => {
  it("flags NFL Thursday Night Football as prime-time marquee", () => {
    const ctx = classifyMarqueeGame(baseGame({ date: "2024-09-12" }), "nfl");
    assert.equal(ctx.isMarquee, true);
    assert.ok(ctx.tags.includes("prime-time"));
    assert.ok(ctx.reasons.some((r) => r.includes("Thursday")));
  });

  it("flags La Liga El Clásico as rivalry marquee", () => {
    const game = baseGame({
      league: "LALIGA",
      date: "2024-03-15",
      homeTeam: "BAR",
      awayTeam: "RMA",
      totalPoints: 3,
      totalFouls: 6,
      closingTotal: 2.5,
      homeSpread: 0,
    });
    const ctx = classifyMarqueeGame(game, "laliga");
    assert.equal(ctx.isMarquee, true);
    assert.ok(ctx.tags.includes("rivalry"));
  });

  it("returns non-marquee for routine midweek NBA games", () => {
    const game = baseGame({
      league: "NBA",
      date: "2024-02-14",
      homeTeam: "CHA",
      awayTeam: "ORL",
      totalPoints: 210,
      totalFouls: 38,
      closingTotal: 220,
      homeSpread: 6,
    });
    assert.equal(isMarqueeGame(game, "nba"), false);
  });

  it("ignores non-professional leagues", () => {
    const game = baseGame({ league: "CBB" });
    assert.equal(isMarqueeGame(game, "cbb"), false);
  });
});

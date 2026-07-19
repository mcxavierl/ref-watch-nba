import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeLeverageIndex,
  isMarqueeLeverageIndex,
  LEVERAGE_INDEX_MARQUEE_THRESHOLD,
  resolveBettingSplitFlow,
} from "@/lib/leverage-index";

describe("leverage-index", () => {
  it("weights broadcast, stakes, and betting into a 0-100 score", () => {
    const primeRivalry = computeLeverageIndex({
      leagueId: "nba",
      game: { id: "001", awayTeam: "BOS", homeTeam: "LAL" },
      slateDate: "2026-12-25",
      oddsLine: {
        awayTeam: "BOS",
        homeTeam: "LAL",
        total: 228.5,
        homeSpread: -2.5,
        publicHandlePct: 68,
        sharpHandlePct: 32,
        source: "the-odds-api",
        lastUpdated: "2026-12-25T00:00:00.000Z",
      },
    });

    assert.ok(primeRivalry.index >= 0 && primeRivalry.index <= 100);
    assert.ok(primeRivalry.index > LEVERAGE_INDEX_MARQUEE_THRESHOLD);
    assert.equal(primeRivalry.isMarquee, true);
    assert.match(primeRivalry.breakdownTooltip, /Prime-time/);
    assert.equal(
      primeRivalry.bettingSplit.publicPct + primeRivalry.bettingSplit.sharpPct,
      100,
    );
  });

  it("downgrades preseason assignments", () => {
    const preseason = computeLeverageIndex({
      leagueId: "nfl",
      game: {
        id: "401",
        awayTeam: "LAC",
        homeTeam: "DET",
        seasonStage: "preseason",
      },
      slateDate: "2026-08-06",
      seasonStage: "preseason",
    });

    assert.ok(preseason.index < LEVERAGE_INDEX_MARQUEE_THRESHOLD);
    assert.equal(preseason.isMarquee, false);
  });

  it("uses explicit betting splits when present on odds lines", () => {
    const split = resolveBettingSplitFlow(
      {
        leagueId: "nfl",
        game: { id: "401", awayTeam: "DAL", homeTeam: "PHI" },
        slateDate: "2026-09-14",
        oddsLine: {
          awayTeam: "DAL",
          homeTeam: "PHI",
          total: 47.5,
          homeSpread: -2.5,
          publicHandlePct: 72,
          sharpHandlePct: 28,
          source: "the-odds-api",
          lastUpdated: "2026-09-14T00:00:00.000Z",
        },
      },
      { isMarquee: true, tags: ["prime-time"], reasons: [] },
    );

    assert.equal(split.publicPct, 72);
    assert.equal(split.sharpPct, 28);
  });

  it("detects marquee threshold", () => {
    assert.equal(isMarqueeLeverageIndex(76), true);
    assert.equal(isMarqueeLeverageIndex(75), false);
    assert.equal(isMarqueeLeverageIndex(null), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRollingWindowBaselines } from "@/lib/cron/rolling-ref-metrics";
import type { RefGameRecord } from "@/lib/types";

function game(index: number, fouls: number, season = "2025-26"): RefGameRecord {
  return {
    gameId: `g-${index}`,
    date: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
    season,
    homeTeam: "TOR",
    awayTeam: "BOS",
    totalPoints: 220,
    totalFouls: fouls,
    overHit: true,
    raptorsInvolved: false,
  };
}

describe("rolling-ref-metrics", () => {
  it("builds last 25, last 50, and current-season baselines", () => {
    const games = Array.from({ length: 60 }, (_, index) => game(index + 1, 18 + (index % 5)));
    const baselines = buildRollingWindowBaselines(games, "2025-26");
    assert.equal(baselines.length, 3);
    assert.equal(baselines[0]?.window, "last_25_games");
    assert.equal(baselines[1]?.window, "last_50_games");
    assert.equal(baselines[2]?.window, "current_season");
    assert.ok((baselines[0]?.consistencyScore ?? 0) >= 0);
    assert.ok((baselines[0]?.stdDev ?? 0) >= 0);
  });
});

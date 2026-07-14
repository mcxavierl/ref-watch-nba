import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clearRuntimeGameLogsModuleCache } from "@/lib/game-logs";
import { buildOverviewMatchupInsight } from "@/lib/overview-matchup-insight";
import type { RuntimeGameLogEntry, RuntimeGameLogFile } from "@/lib/game-logs-preload";
import { setCachedGameLogs } from "@/lib/game-logs-preload";
import { getWorkerIsolateStore } from "@/lib/worker-isolate-store";

function resetNflLogs(): void {
  getWorkerIsolateStore().gameLogs.NFL = undefined;
  clearRuntimeGameLogsModuleCache();
}

function nflGame(
  index: number,
  away: string,
  home: string,
  season: string,
  totalPoints: number,
  totalFouls: number,
): RuntimeGameLogEntry {
  return {
    gameId: `nfl-${index}`,
    date: "2024-11-01",
    season,
    league: "NFL",
    awayTeam: away,
    homeTeam: home,
    homeScore: Math.floor(totalPoints / 2),
    awayScore: Math.ceil(totalPoints / 2),
    totalPoints,
    totalFouls,
    closingTotal: totalPoints,
    homeSpread: -3,
    lineSource: "external",
    officials: [{ name: "Test Official", number: 42, role: "referee" }],
  };
}

function seedNflLogs(games: RuntimeGameLogEntry[]): void {
  const file: RuntimeGameLogFile = {
    lastUpdated: "2026-07-14",
    league: "NFL",
    source: "test",
    games,
  };
  setCachedGameLogs("NFL", file);
}

describe("overview-matchup-insight", () => {
  it("uses LAC/SD alias for NFL head-to-head history", () => {
    resetNflLogs();
    seedNflLogs([
      nflGame(1, "SD", "DET", "2023-24", 50, 12),
      nflGame(2, "LAC", "KC", "2023-24", 44, 10),
    ]);

    const insight = buildOverviewMatchupInsight("nfl", "LAC", "DET");
    assert.match(insight ?? "", /Last 5 seasons \(1 meeting\)/);
    assert.match(insight ?? "", /50\.0 total points and 12\.0 flags per game/);
  });

  it("falls back to all-time sample when no recent meetings exist", () => {
    resetNflLogs();
    seedNflLogs([
      nflGame(1, "SD", "DET", "2001-02", 48, 11),
      nflGame(2, "LAC", "DET", "2003-04", 52, 13),
      nflGame(3, "LAC", "KC", "2005-06", 44, 10),
      nflGame(4, "LAC", "KC", "2007-08", 44, 10),
      nflGame(5, "LAC", "KC", "2009-10", 44, 10),
      nflGame(6, "LAC", "KC", "2011-12", 44, 10),
      nflGame(7, "LAC", "KC", "2023-24", 44, 10),
    ]);

    const insight = buildOverviewMatchupInsight("nfl", "LAC", "DET");
    assert.match(insight ?? "", /All-time sample \(2 meetings\)/);
    assert.match(insight ?? "", /50\.0 total points and 12\.0 flags per game/);
  });

  it("returns undefined when teams have never met", () => {
    resetNflLogs();
    seedNflLogs([nflGame(1, "LAC", "KC", "2023-24", 44, 10)]);
    assert.equal(buildOverviewMatchupInsight("nfl", "LAC", "DET"), undefined);
  });
});

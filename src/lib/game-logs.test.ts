import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import {
  getCachedGameLogs,
  setCachedGameLogs,
  type RuntimeGameLogFile,
} from "@/lib/game-logs-preload";
import {
  beginWorkerIsolateRequest,
  endWorkerIsolateRequest,
} from "@/lib/worker-isolate-store";

const SAMPLE_LOGS: RuntimeGameLogFile = {
  lastUpdated: "2026-01-01",
  league: "NFL",
  source: "test",
  games: [
    {
      gameId: "g1",
      date: "2025-01-01",
      season: "2024-25",
      league: "NFL",
      homeTeam: "KC",
      awayTeam: "BUF",
      homeScore: 24,
      awayScore: 21,
      totalPoints: 45,
      totalFouls: 0,
      closingTotal: 47,
      homeSpread: -3,
      lineSource: "external",
      officials: [],
    },
  ],
};

describe("loadRuntimeGameLogs", () => {
  it("reads game logs from global cache after a prior Worker miss", () => {
    endWorkerIsolateRequest();
    beginWorkerIsolateRequest();

    const first = loadRuntimeGameLogs("NFL");
    assert.equal(first, null);

    setCachedGameLogs("NFL", SAMPLE_LOGS);
    const second = loadRuntimeGameLogs("NFL");
    assert.equal(second?.games.length, 1);
    assert.equal(getCachedGameLogs("NFL")?.games.length, 1);
  });
});

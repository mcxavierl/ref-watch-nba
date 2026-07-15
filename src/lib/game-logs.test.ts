import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  clearRuntimeGameLogsModuleCache,
  loadRuntimeGameLogs,
} from "@/lib/game-logs";
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
    clearRuntimeGameLogsModuleCache();

    setCachedGameLogs("NFL", SAMPLE_LOGS);
    const loaded = loadRuntimeGameLogs("NFL");
    assert.equal(loaded?.games.length, 1);
    assert.equal(getCachedGameLogs("NFL")?.games.length, 1);
  });

  it("checks global cache before module cache (Worker null-cache regression)", () => {
    const source = readFileSync("src/lib/game-logs.ts", "utf8");
    const fnStart = source.indexOf("export function loadRuntimeGameLogs");
    assert.ok(fnStart >= 0);
    const fnBody = source.slice(fnStart, fnStart + 600);
    assert.match(
      fnBody,
      /const fromGlobal = getCachedGameLogs\(league\)/,
      "must consult getCachedGameLogs before module cache",
    );
    const globalReturn = fnBody.indexOf("if (fromGlobal)");
    const moduleReturn = fnBody.indexOf("const moduleCached = cache.get(league)");
    assert.ok(
      globalReturn >= 0 && moduleReturn >= 0 && globalReturn < moduleReturn,
      "global cache must be checked before module cache",
    );
  });
});

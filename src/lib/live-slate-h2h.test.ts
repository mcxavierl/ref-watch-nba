import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { clearRuntimeGameLogsModuleCache } from "@/lib/game-logs";
import { setCachedGameLogs } from "@/lib/game-logs-preload";
import { collectLeagueSlateEntries } from "@/lib/overview-upcoming-slate";
import {
  buildHistoricalMatchupBaseline,
  PENDING_EMPTY_H2H_COPY,
} from "@/lib/slate-intelligence";
import type { AssignmentsFile } from "@/lib/types";

describe("live slate head-to-head rebuild", () => {
  it("builds matchup context from cached game logs when disk reads are unavailable", () => {
    const wnbaLogs = JSON.parse(
      readFileSync("data/wnba/game-logs.json", "utf8"),
    ) as Parameters<typeof setCachedGameLogs>[1];

    clearRuntimeGameLogsModuleCache();
    setCachedGameLogs("WNBA", wnbaLogs);

    const assignments = JSON.parse(
      readFileSync("data/wnba/assignments.json", "utf8"),
    ) as AssignmentsFile;
    const game = assignments.games.find((entry) => entry.matchup.includes("CON @ WAS"));
    assert.ok(game, "expected CON @ WAS on WNBA assignments slate");

    const entry = collectLeagueSlateEntries("wnba", assignments).find(
      (row) => row.gameId === game!.id,
    );
    assert.ok(entry, "expected slate entry for CON @ WAS");

    const baseline = buildHistoricalMatchupBaseline(entry);
    assert.equal(baseline.isEmptyFallback, false);
    assert.notEqual(baseline.lines[0], PENDING_EMPTY_H2H_COPY);
    assert.ok((entry.preview?.matchupBriefing?.h2hGames ?? 0) > 0);

    clearRuntimeGameLogsModuleCache();
  });
});

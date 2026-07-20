#!/usr/bin/env npx tsx
/**
 * Rebuild ref-stats from game logs before deploy copy.
 * NBA: full rebuild with BBR W-L overlay; other leagues: game-count sync only.
 */
import * as path from "node:path";
import {
  syncNbaRefStatsFromLogs,
  type SyncNbaRefStatsResult,
} from "./fix-nba-ref-game-counts";
import {
  syncRefGameCountsFromLogs,
  type SyncRefGameCountsResult,
} from "./fix-ref-game-counts";
import { generateMatrixData } from "./ingest/generate-matrix-data";

export interface SyncRefStatsFromLogsResult {
  nba: SyncNbaRefStatsResult;
  otherLeagues: SyncRefGameCountsResult;
}

export function syncRefStatsFromLogs(root?: string): SyncRefStatsFromLogsResult {
  const r = root ?? process.cwd();
  const nba = syncNbaRefStatsFromLogs(r);
  const otherLeagues = syncRefGameCountsFromLogs(r, { skipLeagues: ["nba"] });
  generateMatrixData(r);
  return { nba, otherLeagues };
}

function main(): void {
  console.log("=== Sync ref-stats from game logs ===\n");

  const result = syncRefStatsFromLogs();
  const { nba, otherLeagues } = result;

  console.log(
    `nba: ${nba.refCount} refs (${nba.sampleGamesBefore} → ${nba.sampleGamesAfter} games for Buchert)`,
  );
  for (const league of otherLeagues.leagues) {
    console.log(
      `${league.id}: ${league.refCount} refs, sample ${league.sampleName} ` +
        `${league.sampleGamesBefore} → ${league.sampleGamesAfter} games`,
    );
  }

  console.log("\nDone.");
}

if (import.meta.url.startsWith("file:")) {
  const executed = path.resolve(process.argv[1] ?? "");
  const modulePath = path.resolve(new URL(import.meta.url).pathname);
  if (executed === modulePath) {
    main();
  }
}

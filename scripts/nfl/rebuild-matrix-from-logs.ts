#!/usr/bin/env npx tsx
/**
 * Rebuild NFL ref×team W-L from stored ESPN game logs (no re-scrape).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { loadGameLogs } from "../lib/game-logs";
import { applyGameLogTeamStats } from "./lib/rebuild-team-stats-from-logs";
import { finalizeNflVerifiedArtifacts } from "./lib/write-season-shards";
import type { RefStatsFile } from "../../src/lib/types";

const DATA_DIR = path.join(process.cwd(), "data", "nfl");
const STATS_PATH = path.join(DATA_DIR, "ref-stats.json");

function main() {
  const logs = loadGameLogs("NFL");
  if (!logs || logs.games.length === 0) {
    console.error("No NFL game logs found. Run npm run build-nfl-data first.");
    process.exit(1);
  }

  let stats: RefStatsFile;
  try {
    stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;
  } catch {
    console.error("No NFL ref-stats.json found.");
    process.exit(1);
  }

  const rebuilt = applyGameLogTeamStats(stats, logs);
  fs.writeFileSync(STATS_PATH, `${JSON.stringify(rebuilt.stats, null, 2)}\n`);

  console.log(
    `Rebuilt ${rebuilt.refCount} officials from ${rebuilt.gameCount} game logs`,
  );
  console.log(
    `Matrix coverage: ${rebuilt.qualifiedPairs}/${rebuilt.teamStatsPairs} ref×team pairs with 3+ games`,
  );

  const { shards } = finalizeNflVerifiedArtifacts(logs.games, process.cwd(), {
    dataSource: rebuilt.stats.meta.data_source,
    note: rebuilt.stats.meta.note,
  });
  console.log(
    `Refreshed ${shards.shardCount} season shards (${shards.gameCount} games)`,
  );
}

main();

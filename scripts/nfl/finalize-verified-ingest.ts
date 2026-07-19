#!/usr/bin/env npx tsx
/**
 * Finalize verified NFL ingest artifacts from stored game logs:
 * - Per-season NDJSON shards under data/nfl/game-logs/{season}.ndjson
 * - manifest.json with data_verified and provenance
 * - Validation gates (officials, DISTINCT game_id, team/score sanity)
 *
 * Run after build-nfl-data or rebuild-nfl-matrix. Used by ingest:nfl.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { loadGameLogs } from "../lib/game-logs";
import { assertNflIngestValid } from "./lib/validate-ingest";
import { finalizeNflVerifiedArtifacts } from "./lib/write-season-shards";
import type { RefStatsFile } from "../../src/lib/types";

const DATA_DIR = path.join(process.cwd(), "data", "nfl");
const STATS_PATH = path.join(DATA_DIR, "ref-stats.json");

function main(): void {
  const logs = loadGameLogs("NFL");
  if (!logs?.games.length) {
    console.error("No NFL game logs found. Run npm run build-nfl-data first.");
    process.exit(1);
  }

  console.log(`Validating ${logs.games.length} NFL game logs…`);
  assertNflIngestValid(logs.games, { minGames: 2500 });

  let dataSource = "ESPN + nflverse (2016-2026)";
  try {
    const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;
    if (stats.meta.data_source) {
      dataSource = stats.meta.data_source.replace(/\u2013|\u2014/g, "-");
    }
  } catch {
    /* use default */
  }

  const { shards, manifest } = finalizeNflVerifiedArtifacts(logs.games, process.cwd(), {
    dataSource,
    note:
      "Officials from ESPN summaries (2016-2026). " +
      "Ref-stats rebuilt from DISTINCT game_id in game logs.",
  });

  console.log(
    `Wrote ${shards.shardCount} season shards (${shards.gameCount} games) → data/nfl/game-logs/`,
  );
  console.log(`Wrote manifest (${manifest.data_verified ? "verified" : "unverified"})`);
}

main();

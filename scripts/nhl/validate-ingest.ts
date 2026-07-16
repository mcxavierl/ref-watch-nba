#!/usr/bin/env npx tsx
/**
 * Hard-fail validation for NHL verified ingest artifacts.
 * Run after build-nhl-data or rebuild-nhl-from-logs.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { loadGameLogs } from "../lib/game-logs";
import {
  formatValidationReport,
  validateNhlGameLogs,
} from "./lib/validate-ingest";

const ROOT = process.cwd();
const MIN_GAMES = Number.parseInt(process.env.NHL_MIN_GAMES ?? "10000", 10);

function main(): void {
  const logs = loadGameLogs("NHL");
  if (!logs || logs.games.length === 0) {
    console.error("No NHL game logs at data/nhl/game-logs.json");
    process.exit(1);
  }

  const summary = validateNhlGameLogs(logs.games, { minGames: MIN_GAMES });
  console.log(formatValidationReport(summary));

  const manifestPath = path.join(ROOT, "data", "nhl", "manifest.json");
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      data_verified?: boolean;
      game_count?: number;
    };
    if (!manifest.data_verified) {
      console.error("FAIL manifest: data_verified is not true");
      process.exit(1);
    }
    if (manifest.game_count !== summary.gameCount) {
      console.error(
        `FAIL manifest: game_count ${manifest.game_count} != logs ${summary.gameCount}`,
      );
      process.exit(1);
    }
    console.log(`  PASS manifest: ${manifest.game_count} games, verified`);
  } else {
    console.warn("WARN: data/nhl/manifest.json missing (run rebuild-nhl-from-logs)");
  }

  const shardDir = path.join(ROOT, "data", "nhl", "game-logs");
  if (fs.existsSync(shardDir)) {
    const shards = fs.readdirSync(shardDir).filter((f) => f.endsWith(".ndjson"));
    console.log(`  INFO season shards: ${shards.length} files in data/nhl/game-logs/`);
  }

  if (!summary.passed) {
    process.exit(1);
  }
}

main();

#!/usr/bin/env npx tsx
/**
 * Validation gates for WNBA ingest artifacts.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { loadGameLogs } from "../lib/game-logs";

const ROOT = process.cwd();
const MIN_GAMES = Number.parseInt(process.env.WNBA_MIN_GAMES ?? "3000", 10);

function main(): void {
  const logs = loadGameLogs("WNBA");
  if (!logs || logs.games.length === 0) {
    console.warn("WARN: No WNBA game logs at data/wnba/game-logs.json (scaffold only)");
    process.exit(0);
  }

  console.log(`WNBA game logs: ${logs.games.length} games`);
  if (logs.games.length < MIN_GAMES) {
    console.warn(
      `WARN: ${logs.games.length} games below WNBA_MIN_GAMES=${MIN_GAMES} verification floor`,
    );
    process.exit(0);
  }

  const manifestPath = path.join(ROOT, "data", "wnba", "manifest.json");
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      data_verified?: boolean;
      game_count?: number;
    };
    if (!manifest.data_verified) {
      console.error("FAIL manifest: data_verified is not true");
      process.exit(1);
    }
    if (manifest.game_count !== logs.games.length) {
      console.error(
        `FAIL manifest: game_count ${manifest.game_count} != logs ${logs.games.length}`,
      );
      process.exit(1);
    }
    console.log(`PASS manifest: ${manifest.game_count} games, verified`);
  }

  console.log("WNBA ingest validation passed.");
}

main();

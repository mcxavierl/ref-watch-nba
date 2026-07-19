#!/usr/bin/env npx tsx
/**
 * Drop pre-2016 NFL game logs and rebuild verified ref-stats for the 2016-2026 window.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { loadGameLogs } from "../lib/game-logs";

export const NFL_PRODUCT_MIN_SEASON = "2016-17";

const DATA_DIR = path.join(process.cwd(), "data", "nfl");
const LOGS_PATH = path.join(DATA_DIR, "game-logs.json");
const SHARD_DIR = path.join(DATA_DIR, "game-logs");

function seasonStartYear(label: string): number {
  return Number.parseInt(label.split("-")[0] ?? "", 10);
}

function filterProductWindowGames<T extends { season: string }>(games: T[]): T[] {
  const minYear = seasonStartYear(NFL_PRODUCT_MIN_SEASON);
  return games.filter((game) => {
    const start = seasonStartYear(game.season);
    return Number.isFinite(start) && start >= minYear;
  });
}

export function trimNflGameLogs(root = process.cwd()): {
  before: number;
  after: number;
  seasons: string[];
} {
  const dataDir = path.join(root, "data", "nfl");
  const logsPath = path.join(dataDir, "game-logs.json");
  const shardDir = path.join(dataDir, "game-logs");
  const raw = JSON.parse(fs.readFileSync(logsPath, "utf8")) as {
    games: { season: string }[];
    lastUpdated?: string;
    league?: string;
    source?: string;
  };

  const before = raw.games.length;
  const filtered = filterProductWindowGames(raw.games);
  const seasons = [...new Set(filtered.map((game) => game.season))].sort();

  fs.writeFileSync(
    logsPath,
    `${JSON.stringify(
      {
        ...raw,
        lastUpdated: new Date().toISOString(),
        games: filtered,
      },
      null,
      2,
    )}\n`,
  );

  if (fs.existsSync(shardDir)) {
    for (const entry of fs.readdirSync(shardDir)) {
      if (!entry.endsWith(".ndjson")) continue;
      const season = entry.replace(/\.ndjson$/, "");
      if (seasonStartYear(season) < seasonStartYear(NFL_PRODUCT_MIN_SEASON)) {
        fs.unlinkSync(path.join(shardDir, entry));
      }
    }
  }

  return { before, after: filtered.length, seasons };
}

function main(): void {
  console.log("=== Trim NFL data to 2016-2026 product window ===\n");

  const result = trimNflGameLogs();
  console.log(
    `Filtered game logs: ${result.before} → ${result.after} (${result.seasons.length} seasons)`,
  );

  console.log("\nRebuilding NFL ref-stats from trimmed logs…");
  execSync("npm run build-nfl-data -- --from-logs-only --skip-historical", {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  const logs = loadGameLogs("NFL");
  const count = logs?.games.length ?? 0;
  if (count < 2500) {
    throw new Error(`Expected at least 2500 NFL games after trim, got ${count}`);
  }

  console.log(`\nDone. NFL product window: ${NFL_PRODUCT_MIN_SEASON} through latest season (${count} games).`);
}

if (import.meta.url.startsWith("file:")) {
  const executed = path.resolve(process.argv[1] ?? "");
  const modulePath = path.resolve(new URL(import.meta.url).pathname);
  if (executed === modulePath) {
    main();
  }
}

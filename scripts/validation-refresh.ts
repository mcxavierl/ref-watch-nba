#!/usr/bin/env npx tsx
/**
 * Refresh walk-forward validation artifacts: merge external lines, rerun backtest.
 */
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadEnvFiles } from "./lib/load-env";

loadEnvFiles();

const ROOT = process.cwd();
const GAME_LINES = path.join(ROOT, "data", "game-lines.json");

function readLineCount(): number {
  if (!fs.existsSync(GAME_LINES)) return 0;
  const raw = JSON.parse(fs.readFileSync(GAME_LINES, "utf8")) as { lines?: unknown[] };
  return Array.isArray(raw.lines) ? raw.lines.length : 0;
}

function main(): void {
  const lineCount = readLineCount();
  const hasOddsKey = Boolean(process.env.ODDS_API_KEY?.trim());

  if (lineCount === 0) {
    console.warn(
      "validation:refresh: game-lines.json is empty. External-line backtests will stay at zero until lines are ingested.",
    );
    if (!hasOddsKey) {
      console.warn(
        "  Set ODDS_API_KEY, then run: npm run fetch-nba-historical-lines -- --full",
      );
    } else {
      console.warn("  Run: npm run fetch-nba-historical-lines -- --full");
    }
  }

  try {
    execSync("npm run merge-market-lines", { cwd: ROOT, stdio: "inherit" });
  } catch {
    console.warn("validation:refresh: merge-market-lines failed; continuing with backtest.");
  }
  execSync("npm run backtest", { cwd: ROOT, stdio: "inherit" });

  console.log("validation:refresh: updated data/backtest-results.json and BACKTEST.md");
}

main();

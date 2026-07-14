#!/usr/bin/env npx tsx
/**
 * CFB backfill from ESPN team schedules: scores, penalties, and official crews.
 *
 * Phases (mirrors scripts/cbb/build-ref-data.ts with extract/transform split):
 *   default          — extract from ESPN, then transform to ref-stats + game-logs
 *   --extract-only   — fetch schedules/summaries → data/cfb/raw/extracted-games.json
 *   --transform-only — rebuild outputs from extracted raw (no network)
 *   --sample         — write SEC verified sample instead of ESPN pipeline
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { RefStatsFile } from "../../src/lib/types";
import { splitRefStatsForDeploy } from "../lib/split-ref-stats";
import { computeLeagueBaselines, loadBaselines, saveBaselines } from "../lib/baselines";
import { buildSecVerifiedSample } from "./build-sec-verified-sample";
import { extractCfbGamesFromEspn } from "./lib/extract";
import {
  emptyCfbSeed,
  transformExtractedCfbGames,
  type CfbGameLogEntry,
} from "./lib/transform";
import {
  CFB_DATA_DIR,
  GAME_LOGS_PATH,
  REF_STATS_CORE_PATH,
  REF_STATS_PATH,
  TEAM_SPLITS_PATH,
} from "./lib/paths";

function parseArgs(argv: string[]): {
  extractOnly: boolean;
  transformOnly: boolean;
  sample: boolean;
} {
  return {
    extractOnly: argv.includes("--extract-only"),
    transformOnly: argv.includes("--transform-only"),
    sample: argv.includes("--sample"),
  };
}

function loadSeed(): RefStatsFile {
  if (fs.existsSync(REF_STATS_PATH)) {
    const existing = JSON.parse(
      fs.readFileSync(REF_STATS_PATH, "utf8"),
    ) as RefStatsFile;
    if (existing.refs?.length) return existing;
  }
  return emptyCfbSeed();
}

function writeGameLogs(gameLogs: CfbGameLogEntry[]): void {
  fs.mkdirSync(CFB_DATA_DIR, { recursive: true });
  fs.writeFileSync(
    GAME_LOGS_PATH,
    `${JSON.stringify(
      {
        lastUpdated: new Date().toISOString(),
        league: "CFB",
        source: "espn",
        games: gameLogs,
      },
      null,
      2,
    )}\n`,
  );
}

function writeRefOutputs(stats: RefStatsFile): void {
  fs.mkdirSync(CFB_DATA_DIR, { recursive: true });
  fs.writeFileSync(REF_STATS_PATH, `${JSON.stringify(stats, null, 2)}\n`);

  const split = splitRefStatsForDeploy(stats);
  fs.writeFileSync(REF_STATS_CORE_PATH, `${JSON.stringify(split.core, null, 2)}\n`);
  fs.writeFileSync(TEAM_SPLITS_PATH, `${JSON.stringify(split.teamSplits, null, 2)}\n`);
}

function updateBaselines(gameLogs: CfbGameLogEntry[]): void {
  const existing = loadBaselines();
  if (!existing) return;
  existing.CFB = computeLeagueBaselines("CFB", gameLogs);
  existing.generatedAt = new Date().toISOString();
  saveBaselines(existing);
}

async function runSample(): Promise<void> {
  const full = buildSecVerifiedSample();
  writeRefOutputs(full);
  console.log(
    `CFB SEC verified sample: ${full.refs.length} refs, ` +
      `${full.meta.totalGamesProcessed} games → ${path.relative(process.cwd(), CFB_DATA_DIR)}/`,
  );
}

async function runExtract(): Promise<void> {
  const summary = await extractCfbGamesFromEspn();
  console.log(
    `\nExtract complete: ${summary.fetched} summaries ` +
      `(${summary.upserted} new, ${summary.updated} updated) ` +
      `from ${summary.scheduleEvents} schedule events`,
  );
  if (summary.contractFailures > 0) {
    console.log(
      `  ${summary.contractFailures} contract failures logged → logs/errors/cfb-ingest.json`,
    );
  }
  if (summary.fetchErrors > 0) {
    console.log(`  ${summary.fetchErrors} fetch errors (see ingest log)`);
  }
}

async function runTransform(seed: RefStatsFile): Promise<void> {
  const built = transformExtractedCfbGames(seed);

  if (built.gameLogs.length > 0) {
    writeGameLogs(built.gameLogs);
    updateBaselines(built.gameLogs);
    console.log(`Game logs: ${built.gameLogs.length} matches → ${GAME_LOGS_PATH}`);
  } else {
    console.warn("No game logs produced from extracted data.");
  }

  if (!built.stats) {
    console.warn(
      `Insufficient ref-attributed games (${built.refAttributedGames}); ` +
        `keeping existing ref-stats baseline.`,
    );
    if (built.gamesWithoutOfficials > 0) {
      console.warn(
        `  ${built.gamesWithoutOfficials} games lacked ESPN officials (logs only).`,
      );
    }
    return;
  }

  writeRefOutputs(built.stats);

  const qualified = built.stats.refs.reduce(
    (sum, ref) =>
      sum +
      Object.values(ref.teamStats ?? {}).filter((stat) => stat.games >= 3).length,
    0,
  );
  const pairs = built.stats.refs.reduce(
    (sum, ref) => sum + Object.keys(ref.teamStats ?? {}).length,
    0,
  );

  console.log(
    `\nBuilt ${built.stats.meta.totalGamesProcessed} ref-attributed ESPN games → ` +
      `${built.stats.refs.length} officials`,
  );
  console.log(`Team splits: ${Object.keys(built.stats.teamSplits).length} programs`);
  console.log(`Matrix coverage: ${qualified}/${pairs} ref×team pairs with 3+ games`);
}

async function main(): Promise<void> {
  const { extractOnly, transformOnly, sample } = parseArgs(process.argv.slice(2));

  console.log("=== Ref Watch CFB data build (ESPN) ===\n");

  if (sample) {
    await runSample();
    return;
  }

  const seed = loadSeed();

  if (transformOnly) {
    await runTransform(seed);
    return;
  }

  if (extractOnly) {
    await runExtract();
    return;
  }

  await runExtract();
  await runTransform(seed);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

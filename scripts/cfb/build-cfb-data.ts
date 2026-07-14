#!/usr/bin/env npx tsx
/**
 * CFB backfill from ESPN team schedules: scores, penalties, and official crews.
 *
 * Phases (mirrors scripts/cbb/build-ref-data.ts with extract/transform split):
 *   default          — extract from ESPN, then transform to ref-stats + game-logs
 *   --extract-only   — fetch schedules/summaries → data/cfb/raw/extracted-games.json
 *   --transform-only — rebuild outputs from extracted raw (no network)
 *   --sample         — write SEC verified sample instead of ESPN pipeline
 *
 * Game-log threshold (config/cfb-constants.json):
 *   Below minGameLogThreshold for the current season → preview mode (fallback ref-stats, no granular logs)
 *   At or above threshold → full game logs
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { RefStatsFile } from "../../src/lib/types";
import { computeLeagueBaselines, loadBaselines, saveBaselines } from "../lib/baselines";
import { buildSecVerifiedSample } from "./build-sec-verified-sample";
import { loadCfbConstants } from "./lib/constants";
import { extractCfbGamesFromEspn } from "./lib/extract";
import {
  writeCfbFullOutputs,
  writeCfbPreviewOutputs,
} from "./lib/preview-output";
import { REF_STATS_PATH } from "./lib/paths";
import { meetsCfbGameLogThreshold } from "./lib/threshold";
import {
  emptyCfbSeed,
  transformExtractedCfbGames,
} from "./lib/transform";

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

function updateBaselinesFromFullLogs(
  gameLogs: Parameters<typeof computeLeagueBaselines>[1],
): void {
  const existing = loadBaselines();
  if (!existing) return;
  existing.CFB = computeLeagueBaselines("CFB", gameLogs);
  existing.generatedAt = new Date().toISOString();
  saveBaselines(existing);
}

async function runSample(): Promise<void> {
  const full = buildSecVerifiedSample();
  const { splitRefStatsForDeploy } = await import("../lib/split-ref-stats");
  const split = splitRefStatsForDeploy(full);
  const dataDir = path.join(process.cwd(), "data", "cfb");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "ref-stats.json"), `${JSON.stringify(full, null, 2)}\n`);
  fs.writeFileSync(
    path.join(dataDir, "ref-stats-core.json"),
    `${JSON.stringify(split.core, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(dataDir, "team-splits.json"),
    `${JSON.stringify(split.teamSplits, null, 2)}\n`,
  );
  console.log(
    `CFB SEC verified sample: ${full.refs.length} refs, ` +
      `${full.meta.totalGamesProcessed} games → ${path.relative(process.cwd(), dataDir)}/`,
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
  const { minGameLogThreshold } = loadCfbConstants();
  const threshold = meetsCfbGameLogThreshold(built.gameLogs, minGameLogThreshold);

  console.log(
    `Current season ${threshold.currentSeason}: ` +
      `${threshold.currentSeasonCount} games (threshold ${minGameLogThreshold})`,
  );

  if (!threshold.meetsThreshold) {
    writeCfbPreviewOutputs({
      currentSeason: threshold.currentSeason,
      currentSeasonCount: threshold.currentSeasonCount,
      threshold: minGameLogThreshold,
    });
    console.warn(
      `Preview mode: below ${minGameLogThreshold}-game threshold — ` +
        `skipped granular game logs, wrote SEC fallback ref-stats.`,
    );
    return;
  }

  writeCfbFullOutputs({
    currentSeason: threshold.currentSeason,
    currentSeasonCount: threshold.currentSeasonCount,
    threshold: minGameLogThreshold,
    gameLogs: built.gameLogs,
    stats: built.stats,
    seed,
  });

  if (built.gameLogs.length > 0) {
    updateBaselinesFromFullLogs(built.gameLogs);
    console.log(`Game logs: ${built.gameLogs.length} matches (full mode)`);
  } else {
    console.warn("No game logs produced from extracted data.");
  }

  if (!built.stats) {
    console.warn(
      `Insufficient ref-attributed games (${built.refAttributedGames}); ` +
        `ref-stats unchanged or fallback retained.`,
    );
    if (built.gamesWithoutOfficials > 0) {
      console.warn(
        `  ${built.gamesWithoutOfficials} games lacked ESPN officials (logs only).`,
      );
    }
    return;
  }

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

export async function main(): Promise<void> {
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

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

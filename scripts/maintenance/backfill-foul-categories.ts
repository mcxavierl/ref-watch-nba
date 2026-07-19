#!/usr/bin/env npx tsx
/**
 * Backfill missing foul category tags on game-log NDJSON shards.
 *
 * Defaults to dry-run mode so you can inspect counts before writing production data.
 *
 * Usage:
 *   npm run backfill-foul-categories
 *   npm run backfill-foul-categories -- --file data/nfl/game-logs/2024-25.ndjson
 *   npm run backfill-foul-categories -- --write
 */
import * as path from "node:path";
import {
  discoverGameLogShards,
  runFoulCategoryBackfill,
  type BackfillRunReport,
} from "./lib/backfill-foul-categories";

type CliOptions = {
  root: string;
  dryRun: boolean;
  file?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const dryRun = !argv.includes("--write");
  const fileFlagIndex = argv.indexOf("--file");
  const fileEq = argv.find((arg) => arg.startsWith("--file="));
  const file =
    fileEq?.slice("--file=".length) ??
    (fileFlagIndex >= 0 ? argv[fileFlagIndex + 1] : undefined);

  const rootFlagIndex = argv.indexOf("--root");
  const rootEq = argv.find((arg) => arg.startsWith("--root="));
  const root =
    rootEq?.slice("--root=".length) ??
    (rootFlagIndex >= 0 ? argv[rootFlagIndex + 1] : undefined) ??
    process.cwd();

  return { root, dryRun, file };
}

function printShardSummary(report: BackfillRunReport, root: string): void {
  for (const shard of report.shards) {
    const rel = path.relative(root, shard.shardPath);
    if (shard.skippedUnsupportedLeague) {
      console.log(`  - ${rel}: skipped (league not in foul taxonomy)`);
      continue;
    }
    console.log(
      `  - ${rel}: games=${shard.gamesScanned}, modified=${shard.gamesModified}, fouls=${shard.foulEntriesScanned}, tagged=${shard.foulEntriesTagged}, alreadyTagged=${shard.foulEntriesAlreadyTagged}`,
    );
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const shardPaths = options.file
    ? [options.file]
    : discoverGameLogShards(options.root);

  if (shardPaths.length === 0) {
    console.error("No game-log NDJSON shards found under data/*/game-logs/");
    process.exit(1);
  }

  console.log(
    options.dryRun
      ? "Dry run: scanning game-log shards (no files will be written)."
      : "Write mode: updating shards with missing foul categories.",
  );
  console.log(`Root: ${options.root}`);
  console.log(`Shards: ${shardPaths.length}`);

  const report = runFoulCategoryBackfill({
    root: options.root,
    shardPaths,
    dryRun: options.dryRun,
  });

  console.log("");
  console.log("Summary:");
  console.log(`  Shards processed: ${report.shardsProcessed}`);
  console.log(`  Games scanned: ${report.totals.gamesScanned}`);
  console.log(`  Games modified: ${report.totals.gamesModified}`);
  console.log(`  Foul entries scanned: ${report.totals.foulEntriesScanned}`);
  console.log(`  Foul entries tagged: ${report.totals.foulEntriesTagged}`);
  console.log(
    `  Foul entries already tagged: ${report.totals.foulEntriesAlreadyTagged}`,
  );
  console.log("");
  printShardSummary(report, options.root);

  if (options.dryRun) {
    console.log("");
    console.log("Dry run complete. Re-run with --write to persist changes.");
  } else if (report.totals.gamesModified === 0) {
    console.log("");
    console.log("No shard rows required updates.");
  } else {
    console.log("");
    console.log(`Updated ${report.totals.gamesModified} game rows across NDJSON shards.`);
  }
}

main();

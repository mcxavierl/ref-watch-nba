#!/usr/bin/env npx tsx
/**
 * Market Efficiency Audit: join officiating signals with closing lines and
 * test whether ref metrics predict market total delta (actual - closing).
 *
 * Usage:
 *   npm run audit:market-efficiency
 *   npm run audit:market-efficiency -- --merge-lines
 *   npm run audit:market-efficiency -- --fetch-nba-lines --max-days 7
 */
import { mergeMarketLinesForActiveLeagues } from "./lib/game-logs";
import { loadEnvFiles } from "./lib/load-env";
import {
  buildAuditCorpus,
  runMarketEfficiencyAudit,
  writeAuditArtifacts,
} from "./lib/market-efficiency-audit";

loadEnvFiles();

function parseArgs(argv: string[]) {
  let mergeLines = false;
  let fetchNbaLines = false;
  let maxDays = 7;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--merge-lines") mergeLines = true;
    else if (arg === "--fetch-nba-lines") fetchNbaLines = true;
    else if (arg === "--max-days") {
      maxDays = Number.parseInt(argv[++i] ?? "", 10);
    }
  }

  return { mergeLines, fetchNbaLines, maxDays };
}

async function maybeFetchNbaLines(maxDays: number): Promise<void> {
  if (!process.env.ODDS_API_KEY) {
    console.warn(
      "Skipping NBA Odds API fetch: ODDS_API_KEY is not set. " +
        "Run with a paid key or use existing data/game-lines.json.",
    );
    return;
  }

  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    "npx",
    ["tsx", "scripts/nba/fetch-historical-lines.ts", "--max-days", String(maxDays)],
    { stdio: "inherit", cwd: process.cwd(), env: process.env },
  );
  if (result.status !== 0) {
    throw new Error("NBA historical line fetch failed");
  }
}

async function main(): Promise<void> {
  const { mergeLines, fetchNbaLines, maxDays } = parseArgs(process.argv.slice(2));

  if (fetchNbaLines) {
    await maybeFetchNbaLines(maxDays);
  }

  if (mergeLines || fetchNbaLines) {
    console.log("Merging market line shards into game logs...");
    mergeMarketLinesForActiveLeagues();
  }

  console.log("Building officiating + closing-line audit corpus...");
  const records = buildAuditCorpus();
  console.log(`Joined ${records.length.toLocaleString()} external-line games.`);

  const report = runMarketEfficiencyAudit(records);
  const { jsonPath, markdownPath } = writeAuditArtifacts(report);

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${markdownPath}`);

  const flagged = report.rows.filter((row) => !row.isMarketEfficient);
  if (flagged.length === 0) {
    console.log("All tested signals look market-efficient at p >= 0.05.");
  } else {
    console.log("Potential inefficiencies (p < 0.05):");
    for (const row of flagged) {
      console.log(
        `  ${row.league} ${row.signalLabel}: r=${row.correlationWithMarketDelta}, p=${row.pValue}, n=${row.sampleSize}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env npx tsx
/**
 * Download La Liga (SP1) season CSVs from football-data.co.uk.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const SEASON_CODES = [
  "1617", "1718", "1819", "1920", "2021",
  "2122", "2223", "2324", "2425", "2526",
];

const OUT_DIR = path.join(process.cwd(), "data", "laliga", "football-data");

async function fetchSeason(code: string): Promise<void> {
  const url = `https://www.football-data.co.uk/mmz4281/${code}/SP1.csv`;
  const dest = path.join(OUT_DIR, `SP1_${code}.csv`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`SP1 ${code}: HTTP ${res.status}`);
  }
  const text = await res.text();
  if (!text.includes("HomeTeam")) {
    throw new Error(`SP1 ${code}: unexpected CSV payload`);
  }
  fs.writeFileSync(dest, text);
  const rows = text.trim().split("\n").length - 1;
  console.log(`  SP1_${code}.csv — ${rows} rows`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log("Fetching La Liga CSVs…");
  for (const code of SEASON_CODES) {
    await fetchSeason(code);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

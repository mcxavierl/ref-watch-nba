#!/usr/bin/env npx tsx
/** Fetch NBA Stats officials into officials-cache for one season (skip existing). */
import * as fs from "node:fs";
import * as path from "node:path";
import { fetchGameOfficials, fetchSeasonGames } from "./fetch-nba-stats";
import { DATA_ROOT, expectedGameCount, type IngestSeason } from "./config";

async function main() {
  const season = process.argv[2] as IngestSeason | undefined;
  if (!season) {
    console.error("Usage: cache-officials-season.ts <season>");
    process.exit(1);
  }

  const officialsCacheDir = path.join(DATA_ROOT, "officials-cache");
  fs.mkdirSync(officialsCacheDir, { recursive: true });

  const seasonGames = await fetchSeasonGames(season);
  const expected = expectedGameCount(season);
  if (seasonGames.length !== expected) {
    throw new Error(`${season}: got ${seasonGames.length}, expected ${expected}`);
  }

  let fetched = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < seasonGames.length; i++) {
    const game = seasonGames[i]!;
    const cachePath = path.join(officialsCacheDir, `${game.gameId}.json`);
    if (fs.existsSync(cachePath)) {
      skipped++;
      continue;
    }

    let officials: { name: string; number: number }[] = [];
    for (let attempt = 1; attempt <= 6; attempt++) {
      const res = await fetchGameOfficials(game.gameId);
      officials = res.officials;
      if (officials.length >= 2) break;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }

    if (officials.length < 2) {
      failed++;
      console.warn(`FAIL ${game.gameId} ${game.date} (${officials.length} officials)`);
      continue;
    }

    fs.writeFileSync(
      cachePath,
      `${JSON.stringify({ officials, source: "nba-stats-api" })}\n`,
    );
    fetched++;

    if ((i + 1) % 50 === 0) {
      console.log(`${season}: ${i + 1}/${seasonGames.length} (fetched ${fetched}, skip ${skipped}, fail ${failed})`);
    }
  }

  console.log(
    `${season} done: fetched ${fetched}, skipped ${skipped}, failed ${failed}`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

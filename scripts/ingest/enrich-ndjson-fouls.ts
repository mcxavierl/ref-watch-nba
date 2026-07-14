#!/usr/bin/env npx tsx
/**
 * Backfill homeFouls/awayFouls/totalFouls in NBA NDJSON game-log shards.
 * Uses cached BBR boxscores first; optional BBR fetch or NBA Stats fallback.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  BBR_CACHE_DIR,
  BBR_SCHEDULE_MONTHS,
  GAME_LOGS_DIR,
  INGEST_SEASONS,
} from "./config";
import { fetchBbrHtml, readBbrCache } from "./fetch-bbr";
import { fetchNbaBoxFouls } from "./fetch-nba-box-fouls";
import { parseBbrSchedule } from "./parse-schedule";
import {
  bbrBoxscoreCacheKey,
  bbrBoxscoreUrl,
  parseBoxscoreFouls,
} from "./parse-boxscore-fouls";

type NdjsonGame = Record<string, unknown> & {
  gameId: string;
  date: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  homeFouls?: number;
  awayFouls?: number;
  totalFouls?: number;
};

function gameMatchKey(date: string, home: string, away: string): string {
  return `${date}|${home}|${away}`;
}

function buildBbrGameIdIndex(): Map<string, string> {
  const index = new Map<string, string>();

  for (const season of INGEST_SEASONS) {
    const scheduleFiles = [
      path.join(BBR_CACHE_DIR, `schedule_${season}.html`),
      ...BBR_SCHEDULE_MONTHS.map((month) =>
        path.join(BBR_CACHE_DIR, `schedule_${season}_${month}.html`),
      ),
    ];

    for (const filePath of scheduleFiles) {
      if (!fs.existsSync(filePath)) continue;
      const html = fs.readFileSync(filePath, "utf8");
      for (const game of parseBbrSchedule(html, season)) {
        index.set(
          gameMatchKey(game.date, game.homeTeam, game.awayTeam),
          game.bbrGameId,
        );
      }
    }
  }

  return index;
}

async function resolveFouls(
  game: NdjsonGame,
  bbrGameId: string | undefined,
  fetchMissing: boolean,
  nbaFallback: boolean,
): Promise<{ homeFouls: number; awayFouls: number } | null> {
  if (bbrGameId) {
    const cacheKey = bbrBoxscoreCacheKey(bbrGameId);
    let html = readBbrCache(cacheKey);

    if (!html && fetchMissing) {
      try {
        html = await fetchBbrHtml(bbrBoxscoreUrl(bbrGameId), cacheKey);
      } catch (err) {
        console.warn(`BBR fetch error for ${bbrGameId}:`, err);
        html = "";
      }
    }

    if (html) {
      const fouls = parseBoxscoreFouls(html, game.homeTeam, game.awayTeam);
      if (fouls) return fouls;
    }
  }

  if (nbaFallback) {
    const fouls = await fetchNbaBoxFouls(game.gameId, game.homeTeam, game.awayTeam);
    if (fouls) return fouls;
  }

  return null;
}

function alreadyEnriched(game: NdjsonGame): boolean {
  return (game.totalFouls ?? 0) > 0 && (game.homeFouls ?? 0) > 0;
}

async function main() {
  const fetchMissing = process.argv.includes("--fetch-missing");
  const nbaFallback = process.argv.includes("--nba-fallback");

  console.log("Building BBR game id index from schedule cache...");
  const bbrIndex = buildBbrGameIdIndex();
  console.log(`  indexed ${bbrIndex.size} schedule rows`);

  let totalGames = 0;
  let enriched = 0;
  let stillZero = 0;
  let skipped = 0;

  for (const season of INGEST_SEASONS) {
    const shardPath = path.join(GAME_LOGS_DIR, `${season}.ndjson`);
    if (!fs.existsSync(shardPath)) {
      console.warn(`Skipping missing shard ${shardPath}`);
      continue;
    }

    const lines = fs.readFileSync(shardPath, "utf8").split("\n").filter(Boolean);
    const updated: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const game = JSON.parse(lines[i]!) as NdjsonGame;
      totalGames++;

      if (alreadyEnriched(game)) {
        enriched++;
        skipped++;
        updated.push(JSON.stringify(game));
        continue;
      }

      if ((game.homeFouls ?? 0) > 0 && (game.awayFouls ?? 0) > 0) {
        enriched++;
        updated.push(JSON.stringify(game));
        if ((i + 1) % 100 === 0) {
          console.log(`  ${season}: ${i + 1}/${lines.length} processed`);
        }
        continue;
      }

      const bbrGameId = bbrIndex.get(
        gameMatchKey(game.date, game.homeTeam, game.awayTeam),
      );
      const fouls = await resolveFouls(
        game,
        bbrGameId,
        fetchMissing,
        nbaFallback,
      );

      if (fouls) {
        game.homeFouls = fouls.homeFouls;
        game.awayFouls = fouls.awayFouls;
        game.totalFouls = fouls.homeFouls + fouls.awayFouls;
        enriched++;
      } else if ((game.totalFouls ?? 0) > 0) {
        enriched++;
      } else {
        stillZero++;
      }

      updated.push(JSON.stringify(game));

      if ((i + 1) % 100 === 0) {
        console.log(`  ${season}: ${i + 1}/${lines.length} processed`);
      }
    }

    fs.writeFileSync(shardPath, `${updated.join("\n")}\n`);
    console.log(`Wrote ${updated.length} games → ${shardPath}`);
  }

  console.log("\n=== ENRICH COMPLETE ===");
  console.log(`Total games: ${totalGames}`);
  console.log(`Enriched with fouls: ${enriched}`);
  console.log(`Skipped (already enriched): ${skipped}`);
  console.log(`Still zero: ${stillZero}`);
  console.log(`BBR fetch missing: ${fetchMissing}`);
  console.log(`NBA Stats fallback: ${nbaFallback}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

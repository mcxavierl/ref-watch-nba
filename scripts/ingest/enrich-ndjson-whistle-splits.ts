#!/usr/bin/env npx tsx
/**
 * Backfill whistlePeriodSplits in NBA NDJSON game-log shards from cached BBR boxscores.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  BBR_CACHE_DIR,
  BBR_SCHEDULE_MONTHS,
  GAME_LOGS_DIR,
  INGEST_SEASONS,
} from "./config";
import { readBbrCache } from "./fetch-bbr";
import { parseBbrSchedule } from "./parse-schedule";
import {
  bbrBoxscoreCacheKey,
  parseBoxscorePeriodFouls,
  toWhistlePeriodSplits,
} from "./parse-boxscore-fouls";

type NdjsonGame = Record<string, unknown> & {
  gameId: string;
  date: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  whistlePeriodSplits?: ReturnType<typeof toWhistlePeriodSplits>;
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

function enrichShard(shardPath: string, bbrIndex: Map<string, string>): number {
  if (!fs.existsSync(shardPath)) return 0;

  const lines = fs.readFileSync(shardPath, "utf8").trim().split("\n");
  let updated = 0;
  const out: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const game = JSON.parse(line) as NdjsonGame;
    if (game.whistlePeriodSplits?.buckets?.length) {
      out.push(JSON.stringify(game));
      continue;
    }

    const bbrGameId = bbrIndex.get(
      gameMatchKey(game.date, game.homeTeam, game.awayTeam),
    );
    if (bbrGameId) {
      const html = readBbrCache(bbrBoxscoreCacheKey(bbrGameId));
      if (html) {
        const parsed = parseBoxscorePeriodFouls(
          html,
          game.homeTeam,
          game.awayTeam,
        );
        if (parsed) {
          game.whistlePeriodSplits = toWhistlePeriodSplits(parsed);
          updated += 1;
        }
      }
    }

    out.push(JSON.stringify(game));
  }

  fs.writeFileSync(shardPath, `${out.join("\n")}\n`);
  return updated;
}

function main(): void {
  const bbrIndex = buildBbrGameIdIndex();
  let total = 0;

  for (const season of INGEST_SEASONS) {
    const shardPath = path.join(GAME_LOGS_DIR, `${season}.ndjson`);
    const count = enrichShard(shardPath, bbrIndex);
    if (count > 0) {
      console.log(`Enriched ${count} games in ${shardPath}`);
      total += count;
    }
  }

  console.log(`Whistle period splits backfill complete (${total} games updated).`);
}

main();

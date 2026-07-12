#!/usr/bin/env npx tsx
/**
 * Recompute nflAnalytics from game-logs without re-fetching ESPN.
 * Fixes officials whose last-seen role was not "referee" but who have referee samples.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { refSlug } from "../lib/slug";
import type { RefGameRecord, RefStatsFile } from "../../src/lib/types";
import {
  buildNflRefAnalyticsForOfficial,
  computeLeagueAvgFlags,
  computeLeagueAvgPenaltyYards,
} from "./lib/ref-analytics";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data", "nfl");
const LOGS_PATH = path.join(DATA_DIR, "game-logs.json");
const STATS_PATH = path.join(DATA_DIR, "ref-stats.json");

type GameLog = {
  gameId: string;
  date: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  totalFouls: number;
  homeFlags: number;
  awayFlags: number;
  homePenaltyYards: number;
  awayPenaltyYards: number;
  closingTotal: number;
  homeSpread: number;
  officials: { name: string; number: number; role: string }[];
};

function main(): void {
  const logsFile = JSON.parse(fs.readFileSync(LOGS_PATH, "utf8")) as {
    games: GameLog[];
  };
  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;

  const refGames = new Map<string, RefGameRecord[]>();
  const refereeGames = new Map<string, RefGameRecord[]>();

  for (const game of logsFile.games) {
    const overHit = game.totalPoints > game.closingTotal;
    const record: RefGameRecord = {
      gameId: game.gameId,
      date: game.date,
      season: game.season,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      totalPoints: game.totalPoints,
      totalFouls: game.totalFouls,
      homeFlags: game.homeFlags,
      awayFlags: game.awayFlags,
      homePenaltyYards: game.homePenaltyYards,
      awayPenaltyYards: game.awayPenaltyYards,
      totalPenaltyYards: game.homePenaltyYards + game.awayPenaltyYards,
      overHit,
      raptorsInvolved: false,
      closingTotal: game.closingTotal,
      homeSpread: game.homeSpread,
    };

    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      const all = refGames.get(slug) ?? [];
      all.push(record);
      refGames.set(slug, all);
      if (official.role === "referee") {
        const refOnly = refereeGames.get(slug) ?? [];
        refOnly.push(record);
        refereeGames.set(slug, refOnly);
      }
    }
  }

  const allRecords = [...refGames.values()].flat();
  const leagueAvgFlags = computeLeagueAvgFlags(allRecords);
  const leagueAvgPenaltyYards = computeLeagueAvgPenaltyYards(allRecords);

  let updated = 0;
  for (const ref of stats.refs) {
    const all = refGames.get(ref.slug) ?? [];
    const refOnly = refereeGames.get(ref.slug) ?? [];
    const next = buildNflRefAnalyticsForOfficial(
      refOnly,
      all,
      leagueAvgFlags,
      leagueAvgPenaltyYards,
    );
    if (next) {
      ref.nflAnalytics = next;
      updated++;
    }
  }

  stats.meta.leagueAvgPenaltyYards = leagueAvgPenaltyYards;
  fs.writeFileSync(STATS_PATH, `${JSON.stringify(stats)}\n`);
  console.log(
    `Backfilled nflAnalytics for ${updated}/${stats.refs.length} officials (${refGames.size} slugs in logs).`,
  );
}

main();

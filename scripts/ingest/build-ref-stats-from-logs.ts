#!/usr/bin/env npx tsx
/**
 * Build ref-stats.json from verified NBA NDJSON game logs.
 * Betting lines intentionally excluded (synthetic placeholders only).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { crewKey, refSlug } from "../lib/slug";
import {
  canonicalRefKey,
  chooseRefIdentity,
  displayNameForKey,
  type RefVariant,
} from "../lib/ref-identity";
import {
  collectRefTeamStats,
  pushRefTeamGame,
} from "../lib/ref-team-stats";
import { teamWonGame } from "../lib/team-win";
import { buildBaselinesFile, saveBaselines } from "../lib/baselines";
import { loadGameLogs } from "../lib/game-logs";
import type {
  RefGameRecord,
  RefProfile,
  RefStatsFile,
  TeamCrewSplit,
} from "../lib/types";
import { NBA_TEAM_ABBRS } from "./config";
import { INGEST_SEASONS } from "./config";
import { GAME_LOGS_DIR, MANIFEST_PATH } from "./config";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

type NdjsonGame = {
  gameId: string;
  date: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  homeFouls?: number;
  awayFouls?: number;
  totalFouls: number;
  officials: { name: string; number: number; role: string }[];
};

function loadNdjsonGames(): NdjsonGame[] {
  const games: NdjsonGame[] = [];
  for (const season of INGEST_SEASONS) {
    const shard = path.join(GAME_LOGS_DIR, `${season}.ndjson`);
    if (!fs.existsSync(shard)) {
      continue;
    }
    for (const line of fs.readFileSync(shard, "utf8").split("\n")) {
      if (!line.trim()) continue;
      games.push(JSON.parse(line) as NdjsonGame);
    }
  }
  return games;
}

function buildTeamSplit(
  key: string,
  crewNames: string[],
  rows: {
    totalPoints: number;
    totalFouls: number;
    overHit: boolean;
    teamWin: boolean;
    isHome: boolean;
    teamFouls: number;
    opponentFouls: number;
  }[],
  leagueAvgTotal: number,
): TeamCrewSplit {
  const n = rows.length;
  const wins = rows.filter((r) => r.teamWin).length;
  const homeGames = rows.filter((r) => r.isHome);
  const awayGames = rows.filter((r) => !r.isHome);
  const avgTotal = rows.reduce((s, r) => s + r.totalPoints, 0) / n;
  const avgFouls = rows.reduce((s, r) => s + r.totalFouls, 0) / n;
  const avgTeamFouls = rows.reduce((s, r) => s + r.teamFouls, 0) / n;
  const avgOpponentFouls =
    rows.reduce((s, r) => s + r.opponentFouls, 0) / n;

  return {
    crewKey: key,
    crewNames,
    games: n,
    avgTotalPoints: round1(avgTotal),
    overRate: round3(rows.filter((r) => r.overHit).length / n),
    avgFouls: round1(avgFouls),
    wins,
    losses: n - wins,
    totalDelta: round1(avgTotal - leagueAvgTotal),
    homeGames: homeGames.length,
    awayGames: awayGames.length,
    homeWins: homeGames.filter((r) => r.teamWin).length,
    homeLosses: homeGames.filter((r) => !r.teamWin).length,
    awayWins: awayGames.filter((r) => r.teamWin).length,
    awayLosses: awayGames.filter((r) => !r.teamWin).length,
    avgTeamFouls: round1(avgTeamFouls),
    avgOpponentFouls: round1(avgOpponentFouls),
    foulDifferential: round1(avgTeamFouls - avgOpponentFouls),
  };
}

export function buildRefStatsFromLogs(): RefStatsFile {
  const games = loadNdjsonGames();
  const refGames = new Map<string, RefGameRecord[]>();
  const refIdentities = new Map<string, Map<number, RefVariant>>();
  const refTeamBuckets = new Map<string, Map<string, import("../lib/ref-team-stats").RefTeamGameRow[]>>();
  const teamByCrew = new Map<string, Map<string, { crewNames: string[]; games: Parameters<typeof buildTeamSplit>[2] }>>();

  for (const abbr of NBA_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }

  const allDates: string[] = [];
  const overBaseline = 225;

  for (const game of games) {
    allDates.push(game.date);
    const officials = game.officials;
    const crewNames = officials.map((o) => o.name);
    const key = crewKey(officials);

    const record: RefGameRecord = {
      gameId: game.gameId,
      date: game.date,
      season: game.season,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      totalPoints: game.totalPoints,
      totalFouls: game.totalFouls,
      overHit: game.totalPoints > overBaseline,
      raptorsInvolved:
        game.homeTeam === "TOR" || game.awayTeam === "TOR",
    };

    for (const teamAbbr of [game.homeTeam, game.awayTeam]) {
      const isHome = game.homeTeam === teamAbbr;
      const teamWin = teamWonGame(
        game.homeScore,
        game.awayScore,
        game.homeTeam,
        game.awayTeam,
        teamAbbr,
      );
      const teamFouls = isHome
        ? (game.homeFouls ?? 0)
        : (game.awayFouls ?? 0);
      const opponentFouls = isHome
        ? (game.awayFouls ?? 0)
        : (game.homeFouls ?? 0);

      const buckets = teamByCrew.get(teamAbbr)!;
      const existing = buckets.get(key) ?? { crewNames, games: [] };
      existing.games.push({
        totalPoints: game.totalPoints,
        totalFouls: game.totalFouls,
        overHit: record.overHit,
        teamWin,
        isHome,
        teamFouls,
        opponentFouls,
      });
      buckets.set(key, existing);
    }

    for (const official of officials) {
      // Merge on canonical identity so a referee whose jersey number changed
      // between seasons stays one profile instead of splitting into two.
      const refKey = canonicalRefKey(official.name);
      const variants = refIdentities.get(refKey) ?? new Map<number, RefVariant>();
      const variant =
        variants.get(official.number) ??
        { name: official.name, number: official.number, games: 0, lastDate: "" };
      variant.games += 1;
      if (game.date >= variant.lastDate) {
        variant.lastDate = game.date;
        variant.name = official.name;
      }
      variants.set(official.number, variant);
      refIdentities.set(refKey, variants);

      const list = refGames.get(refKey) ?? [];
      list.push(record);
      refGames.set(refKey, list);

      for (const teamAbbr of [game.homeTeam, game.awayTeam]) {
        const isHome = game.homeTeam === teamAbbr;
        const teamWin = teamWonGame(
          game.homeScore,
          game.awayScore,
          game.homeTeam,
          game.awayTeam,
          teamAbbr,
        );
        const teamFouls = isHome
          ? (game.homeFouls ?? 0)
          : (game.awayFouls ?? 0);
        const opponentFouls = isHome
          ? (game.awayFouls ?? 0)
          : (game.homeFouls ?? 0);
        const foulDifferential = teamFouls - opponentFouls;

        pushRefTeamGame(refTeamBuckets, refKey, teamAbbr, {
          foulDifferential,
          totalPoints: game.totalPoints,
          overHit: record.overHit,
          teamWin,
        });
      }
    }
  }

  allDates.sort();
  const nhlGames = loadGameLogs("NHL")?.games ?? [];
  const baselines = buildBaselinesFile(
    games.map((g) => ({
      gameId: g.gameId,
      date: g.date,
      season: g.season,
      league: "NBA" as const,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      totalPoints: g.totalPoints,
      totalFouls: g.totalFouls,
      closingTotal: 225,
      homeSpread: 0,
      lineSource: "synthetic" as const,
      officials: g.officials.map((o) => ({
        name: o.name,
        number: o.number,
        role: "referee" as const,
      })),
    })),
    nhlGames,
    "NBA from BBR + NBA Stats API ingest",
  );
  saveBaselines(baselines);

  const leagueAvgTotal = baselines.NBA.aggregate.leagueAvgTotal;
  const leagueAvgFouls = baselines.NBA.aggregate.leagueAvgFouls;
  const leagueOverBaseline = baselines.NBA.aggregate.leagueOverBaseline;

  const refs: RefProfile[] = [];
  for (const [refKey, gList] of refGames) {
    const identity = chooseRefIdentity(refIdentities.get(refKey)!.values());
    const name = displayNameForKey(refKey, identity.name);
    const slug = refSlug(name, identity.number);
    const avgTotal = gList.reduce((s, g) => s + g.totalPoints, 0) / gList.length;
    const overRate = gList.filter((g) => g.overHit).length / gList.length;
    const avgFouls = gList.reduce((s, g) => s + g.totalFouls, 0) / gList.length;
    const recentGames = [...gList]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);

    refs.push({
      slug,
      name,
      number: identity.number,
      games: gList.length,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      homeCoverRate: null,
      totalPointsDelta: round1(avgTotal - leagueAvgTotal),
      foulsDelta: round1(avgFouls - leagueAvgFouls),
      seasons: [...new Set(gList.map((g) => g.season))].sort(),
      recentGames,
      teamStats: collectRefTeamStats(refTeamBuckets.get(refKey) ?? new Map()),
    });
  }

  refs.sort((a, b) => b.games - a.games);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  for (const [team, buckets] of teamByCrew) {
    teamSplits[team] = [...buckets.entries()]
      .map(([k, data]) =>
        buildTeamSplit(k, data.crewNames, data.games, leagueAvgTotal),
      )
      .sort((a, b) => b.games - a.games);
  }

  let manifestNote = "";
  if (fs.existsSync(MANIFEST_PATH)) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
      last_ingested_at?: string;
    };
    manifestNote = manifest.last_ingested_at ?? "";
  }

  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: [...INGEST_SEASONS],
      leagueAvgTotal,
      leagueAvgFouls,
      leagueOverBaseline,
      minSampleSize: 30,
      source: "hybrid",
      data_verified: true,
      data_source: "Basketball-Reference + NBA Stats API",
      refTeamWinLossSource: "basketball-reference",
      atsAvailable: false,
      refCount: refs.length,
      totalGamesProcessed: games.length,
      dateRange:
        allDates.length > 0
          ? { earliest: allDates[0]!, latest: allDates.at(-1)! }
          : undefined,
      note: `Verified ingest ${manifestNote}`,
    },
    refs,
    teamSplits,
  };
}

export { buildRefStatsFromLogs as default };

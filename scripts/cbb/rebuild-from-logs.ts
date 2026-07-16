#!/usr/bin/env npx tsx
/**
 * Rebuild CBB ref-stats from stored game-logs.json (no ESPN round-trip).
 * Used when ref-stats drift from logs or pick up the wrong league payload.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { crewKey, refSlug } from "../lib/slug";
import { dedupeRefsInPlace } from "../lib/merge-duplicate-refs";
import {
  collectRefTeamStats,
  pushRefTeamGame,
  type RefTeamGameRow,
} from "../lib/ref-team-stats";
import { splitRefStatsForDeploy } from "../lib/split-ref-stats";
import { shouldIngestNcaaGame } from "../../src/lib/ncaa-conference-gate";
import { CBB_TEAM_ABBRS } from "../../src/lib/cbb/teams";
import type {
  RefGameRecord,
  RefProfile,
  RefStatsFile,
  TeamCrewSplit,
} from "../../src/lib/types";

const DATA_DIR = path.join(process.cwd(), "data", "cbb");
const MIN_SAMPLE = 30;

type CbbGameLogEntry = {
  gameId: string;
  date: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  totalFouls: number;
  homeFouls: number;
  awayFouls: number;
  closingTotal: number;
  homeSpread: number;
  lineSource?: "external" | "synthetic";
  officials: { name: string; number: number; role: "referee" }[];
};

type TeamGameRow = {
  totalPoints: number;
  totalFouls: number;
  overHit: boolean;
  teamFouls: number;
  opponentFouls: number;
  teamWin: boolean;
  isHome: boolean;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function buildTeamSplit(
  key: string,
  crewNames: string[],
  games: TeamGameRow[],
  leagueAvgTotal: number,
): TeamCrewSplit {
  const n = games.length;
  const wins = games.filter((g) => g.teamWin).length;
  const homeGames = games.filter((g) => g.isHome);
  const awayGames = games.filter((g) => !g.isHome);
  const avgTotal = games.reduce((s, g) => s + g.totalPoints, 0) / n;
  const avgFouls = games.reduce((s, g) => s + g.totalFouls, 0) / n;
  const avgTeamFouls = games.reduce((s, g) => s + g.teamFouls, 0) / n;
  const avgOpponentFouls = games.reduce((s, g) => s + g.opponentFouls, 0) / n;

  return {
    crewKey: key,
    crewNames,
    games: n,
    avgTotalPoints: round1(avgTotal),
    overRate: round3(games.filter((g) => g.overHit).length / n),
    avgFouls: round1(avgFouls),
    wins,
    losses: n - wins,
    totalDelta: round1(avgTotal - leagueAvgTotal),
    homeGames: homeGames.length,
    awayGames: awayGames.length,
    homeWins: homeGames.filter((g) => g.teamWin).length,
    homeLosses: homeGames.filter((g) => !g.teamWin).length,
    awayWins: awayGames.filter((g) => g.teamWin).length,
    awayLosses: awayGames.filter((g) => !g.teamWin).length,
    avgTeamFouls: round1(avgTeamFouls),
    avgOpponentFouls: round1(avgOpponentFouls),
    foulDifferential: round1(avgTeamFouls - avgOpponentFouls),
  };
}

function buildRefStatsFromLogs(gameLogs: CbbGameLogEntry[]): RefStatsFile {
  const refGames = new Map<string, RefGameRecord[]>();
  const refMeta = new Map<string, { name: string; number: number }>();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const teamByCrew = new Map<
    string,
    Map<string, { crewNames: string[]; games: TeamGameRow[] }>
  >();
  const seasonsSeen = new Set<string>();
  const allDates: string[] = [];
  let linedGames = 0;
  let skippedNoOfficial = 0;
  let skippedNonLiveConference = 0;
  let processed = 0;

  for (const abbr of CBB_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }

  for (const game of gameLogs) {
    if (!game.officials?.length) {
      skippedNoOfficial++;
      continue;
    }
    if (!shouldIngestNcaaGame("cbb", game.homeTeam, game.awayTeam)) {
      skippedNonLiveConference++;
      continue;
    }

    const totalPoints = game.totalPoints;
    const totalFouls = game.totalFouls;
    const overHit = totalPoints > game.closingTotal;
    if (game.lineSource === "external") linedGames++;
    seasonsSeen.add(game.season);
    allDates.push(game.date);

    const record: RefGameRecord = {
      gameId: game.gameId,
      date: game.date,
      season: game.season,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      totalPoints,
      totalFouls,
      overHit,
      raptorsInvolved: false,
      closingTotal: game.closingTotal,
      homeSpread: game.homeSpread,
    };

    const key = crewKey(game.officials);
    const crewNames = game.officials.map((o) => o.name);

    const makeRow = (teamAbbr: string): TeamGameRow | null => {
      if (!CBB_TEAM_ABBRS.includes(teamAbbr)) return null;
      const isHome = game.homeTeam === teamAbbr;
      const isAway = game.awayTeam === teamAbbr;
      if (!isHome && !isAway) return null;
      const teamWin = isHome
        ? game.homeScore > game.awayScore
        : game.awayScore > game.homeScore;
      return {
        totalPoints,
        totalFouls,
        overHit,
        teamFouls: isHome ? game.homeFouls : game.awayFouls,
        opponentFouls: isHome ? game.awayFouls : game.homeFouls,
        teamWin,
        isHome,
      };
    };

    for (const teamAbbr of [game.homeTeam, game.awayTeam]) {
      const buckets = teamByCrew.get(teamAbbr);
      if (!buckets) continue;
      const row = makeRow(teamAbbr);
      if (!row) continue;
      const existing = buckets.get(key) ?? { crewNames, games: [] };
      existing.games.push(row);
      buckets.set(key, existing);
    }

    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      refMeta.set(slug, official);
      const games = refGames.get(slug) ?? [];
      games.push(record);
      refGames.set(slug, games);

      for (const teamAbbr of [game.homeTeam, game.awayTeam]) {
        const row = makeRow(teamAbbr);
        if (!row) continue;
        pushRefTeamGame(refTeamBuckets, slug, teamAbbr, {
          foulDifferential: row.teamFouls - row.opponentFouls,
          totalPoints: row.totalPoints,
          overHit: row.overHit,
          teamWin: row.teamWin,
        });
      }
    }

    processed++;
  }

  const allGameRecords = [...refGames.values()].flat();
  const leagueAvgTotal =
    allGameRecords.reduce((s, g) => s + g.totalPoints, 0) /
    Math.max(allGameRecords.length, 1);
  const leagueAvgFouls =
    allGameRecords.reduce((s, g) => s + g.totalFouls, 0) /
    Math.max(allGameRecords.length, 1);

  const refs: RefProfile[] = [];
  for (const [slug, games] of refGames) {
    const meta = refMeta.get(slug)!;
    const avgTotal = games.reduce((s, g) => s + g.totalPoints, 0) / games.length;
    const overRate = games.filter((g) => g.overHit).length / games.length;
    const avgFouls = games.reduce((s, g) => s + g.totalFouls, 0) / games.length;
    const seasons = [...new Set(games.map((g) => g.season))].sort();

    refs.push({
      slug,
      name: meta.name,
      number: meta.number,
      games: games.length,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      homeCoverRate: null,
      totalPointsDelta: round1(avgTotal - leagueAvgTotal),
      foulsDelta: round1(avgFouls - leagueAvgFouls),
      seasons,
      recentGames: [...games]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 8),
      teamStats: collectRefTeamStats(refTeamBuckets.get(slug) ?? new Map()),
    });
  }

  refs.sort((a, b) => b.games - a.games);
  dedupeRefsInPlace(refs, leagueAvgTotal, leagueAvgFouls);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  for (const [abbr, buckets] of teamByCrew) {
    if (!buckets || buckets.size === 0) continue;
    teamSplits[abbr] = [...buckets.entries()]
      .map(([crewKeyValue, data]) =>
        buildTeamSplit(crewKeyValue, data.crewNames, data.games, leagueAvgTotal),
      )
      .sort((a, b) => b.games - a.games);
  }

  const qualifiedPairs = refs.reduce(
    (sum, ref) =>
      sum +
      Object.values(ref.teamStats ?? {}).filter((stat) => stat.games >= 3)
        .length,
    0,
  );
  const teamStatsPairs = refs.reduce(
    (sum, ref) => sum + Object.keys(ref.teamStats ?? {}).length,
    0,
  );

  allDates.sort();

  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: [...seasonsSeen].sort(),
      leagueAvgTotal: round1(leagueAvgTotal),
      leagueAvgFouls: round1(leagueAvgFouls),
      leagueOverBaseline: round1(leagueAvgTotal),
      minSampleSize: MIN_SAMPLE,
      source: "espn",
      data_verified: true,
      data_source: "ESPN",
      atsAvailable: false,
      refCount: refs.length,
      totalGamesProcessed: processed,
      dateRange: {
        earliest: allDates[0] ?? "",
        latest: allDates.at(-1) ?? "",
      },
      note:
        `Rebuilt from game logs (${processed} live-conference games, ${linedGames} with sportsbook totals). ` +
        `Coverage: ${[...seasonsSeen].sort().join(", ")}. ` +
        `Matrix: ${qualifiedPairs}/${teamStatsPairs} ref×team pairs with 3+ games. ` +
        `${skippedNoOfficial} games skipped (no officials listed). ` +
        `${skippedNonLiveConference} games skipped (outside live conference gate).`,
    },
    refs,
    teamSplits,
  };
}

function main(): void {
  const logsPath = path.join(DATA_DIR, "game-logs.json");
  const logsFile = JSON.parse(fs.readFileSync(logsPath, "utf8")) as {
    games?: CbbGameLogEntry[];
  };
  const gameLogs = logsFile.games ?? [];
  const stats = buildRefStatsFromLogs(gameLogs);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(DATA_DIR, "ref-stats.json"),
    `${JSON.stringify(stats, null, 2)}\n`,
  );

  const { core, teamSplits } = splitRefStatsForDeploy(stats);
  fs.writeFileSync(
    path.join(DATA_DIR, "ref-stats-core.json"),
    `${JSON.stringify(core, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "team-splits.json"),
    `${JSON.stringify(teamSplits, null, 2)}\n`,
  );

  console.log(
    `Rebuilt CBB ref-stats: ${stats.refs.length} refs, ${stats.meta.totalGamesProcessed} games`,
  );
}

main();

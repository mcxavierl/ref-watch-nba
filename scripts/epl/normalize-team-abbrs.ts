#!/usr/bin/env npx tsx
/**
 * Normalize ESPN team abbreviations (MAN→MUN, MNC→MCI) and rebuild aggregates
 * from stored game logs without re-fetching ESPN.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { crewKey, refSlug } from "../lib/slug";
import {
  collectRefTeamStats,
  pushRefTeamGame,
  type RefTeamGameRow,
} from "../lib/ref-team-stats";
import type {
  RefGameRecord,
  RefProfile,
  RefStatsFile,
  TeamCrewSplit,
} from "../../src/lib/types";
import { EPL_TEAM_ABBRS } from "../../src/lib/epl/teams";
import {
  computeEplRefAnalytics,
  computeLeagueAvgPenalties,
  computeLeagueAvgRed,
  computeLeagueAvgYellow,
  type EplGameCardStats,
} from "./lib/ref-analytics";
import { normalizeEplAbbr } from "./lib/espn";
import {
  buildBaselinesFile,
  loadBaselines,
  saveBaselines,
} from "../lib/baselines";
import { loadGameLogs } from "../lib/game-logs";

const DATA_DIR = path.join(process.cwd(), "data", "epl");

type EplGameLogEntry = {
  gameId: string;
  date: string;
  season: string;
  league: "EPL";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  totalFouls: number;
  homeFouls: number;
  awayFouls: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
  homePenalties: number;
  awayPenalties: number;
  closingTotal: number;
  homeSpread: number;
  lineSource: "external" | "synthetic";
  officials: { name: string; number: number; role: "referee" }[];
};

interface TeamGameRow {
  totalPoints: number;
  totalFouls: number;
  overHit: boolean;
  teamFouls: number;
  opponentFouls: number;
  teamWin: boolean;
  isHome: boolean;
}

type EplRefGameRecord = RefGameRecord & EplGameCardStats;

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

function rebuildFromLogs(
  logs: EplGameLogEntry[],
  seed: RefStatsFile,
): RefStatsFile {
  const roster = new Map(
    seed.refs.map((r) => [r.name.toLowerCase(), r.number]),
  );
  const refGames = new Map<string, EplRefGameRecord[]>();
  const refMeta = new Map<string, { name: string; number: number }>();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const teamByCrew = new Map<
    string,
    Map<string, { crewNames: string[]; games: TeamGameRow[] }>
  >();

  for (const abbr of EPL_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }

  for (const log of logs) {
    const homeTeam = normalizeEplAbbr(log.homeTeam);
    const awayTeam = normalizeEplAbbr(log.awayTeam);
    const totalPoints = log.totalPoints;
    const totalFouls = log.totalFouls;
    const overHit = totalPoints > log.closingTotal;
    const crew = log.officials;
    const key = crewKey(crew);
    const crewNames = crew.map((o) => o.name);

    const record: EplRefGameRecord = {
      gameId: log.gameId,
      date: log.date,
      season: log.season,
      homeTeam,
      awayTeam,
      totalPoints,
      totalFouls,
      overHit,
      raptorsInvolved: false,
      closingTotal: log.closingTotal,
      homeSpread: log.homeSpread,
      homeYellowCards: log.homeYellowCards,
      awayYellowCards: log.awayYellowCards,
      homeRedCards: log.homeRedCards,
      awayRedCards: log.awayRedCards,
      homePenalties: log.homePenalties,
      awayPenalties: log.awayPenalties,
    };

    const makeRow = (teamAbbr: string): TeamGameRow | null => {
      const isHome = homeTeam === teamAbbr;
      const isAway = awayTeam === teamAbbr;
      if (!isHome && !isAway) return null;
      const teamWin = isHome
        ? log.homeScore > log.awayScore
        : log.awayScore > log.homeScore;
      return {
        totalPoints,
        totalFouls,
        overHit,
        teamFouls: isHome ? log.homeFouls : log.awayFouls,
        opponentFouls: isHome ? log.awayFouls : log.homeFouls,
        teamWin,
        isHome,
      };
    };

    for (const teamAbbr of [homeTeam, awayTeam]) {
      const row = makeRow(teamAbbr);
      if (!row) continue;
      const buckets = teamByCrew.get(teamAbbr);
      if (!buckets) continue;
      const existing = buckets.get(key) ?? { crewNames, games: [] };
      existing.games.push(row);
      buckets.set(key, existing);
    }

    for (const official of crew) {
      const slug = refSlug(official.name, official.number);
      refMeta.set(slug, official);
      const games = refGames.get(slug) ?? [];
      games.push(record);
      refGames.set(slug, games);

      for (const teamAbbr of [homeTeam, awayTeam]) {
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
  }

  const allGameRecords = [...refGames.values()].flat();
  const leagueAvgTotal =
    allGameRecords.reduce((s, g) => s + g.totalPoints, 0) /
    allGameRecords.length;
  const leagueAvgFouls =
    allGameRecords.reduce((s, g) => s + g.totalFouls, 0) /
    allGameRecords.length;
  const leagueAvgYellow = computeLeagueAvgYellow(allGameRecords);
  const leagueAvgRed = computeLeagueAvgRed(allGameRecords);
  const leagueAvgPenalties = computeLeagueAvgPenalties(allGameRecords);
  const seasonsSeen = [...new Set(logs.map((g) => g.season))].sort();
  const allDates = logs.map((g) => g.date).sort();

  const refs: RefProfile[] = [];
  for (const [slug, games] of refGames) {
    const meta = refMeta.get(slug)!;
    const avgTotal = games.reduce((s, g) => s + g.totalPoints, 0) / games.length;
    const overRate = games.filter((g) => g.overHit).length / games.length;
    const avgFouls = games.reduce((s, g) => s + g.totalFouls, 0) / games.length;
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
      seasons: [...new Set(games.map((g) => g.season))].sort(),
      recentGames: [...games]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 8),
      teamStats: collectRefTeamStats(refTeamBuckets.get(slug) ?? new Map()),
      eplAnalytics: computeEplRefAnalytics(
        games,
        leagueAvgTotal,
        leagueAvgFouls,
        leagueAvgYellow,
        leagueAvgRed,
        leagueAvgPenalties,
      ),
    });
  }
  refs.sort((a, b) => b.games - a.games);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  for (const abbr of EPL_TEAM_ABBRS) {
    const buckets = teamByCrew.get(abbr);
    if (!buckets || buckets.size === 0) continue;
    teamSplits[abbr] = [...buckets.entries()]
      .map(([key, data]) =>
        buildTeamSplit(key, data.crewNames, data.games, leagueAvgTotal),
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

  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: seasonsSeen,
      leagueAvgTotal: round1(leagueAvgTotal),
      leagueAvgFouls: round1(leagueAvgFouls),
      leagueOverBaseline: round1(leagueAvgTotal),
      leagueAvgYellowCards: leagueAvgYellow,
      leagueAvgRedCards: leagueAvgRed,
      leagueAvgPenalties: leagueAvgPenalties,
      minSampleSize: 30,
      source: "espn",
      atsAvailable: false,
      refCount: refs.length,
      totalGamesProcessed: logs.length,
      dateRange: {
        earliest: allDates[0] ?? "",
        latest: allDates.at(-1) ?? "",
      },
      note:
        `Scores, fouls, cards, and referee assignments from ESPN (${logs.length} games). ` +
        `Matrix: ${qualifiedPairs}/${teamStatsPairs} ref×team pairs with 3+ games.`,
    },
    refs,
    teamSplits,
  };
}

function main() {
  const logsPath = path.join(DATA_DIR, "game-logs.json");
  const statsPath = path.join(DATA_DIR, "ref-stats.json");
  const seedPath = path.join(DATA_DIR, "ref-stats.seed.json");

  const raw = JSON.parse(fs.readFileSync(logsPath, "utf8")) as {
    games: EplGameLogEntry[];
  };
  const seed = JSON.parse(fs.readFileSync(seedPath, "utf8")) as RefStatsFile;

  const logs = raw.games.map((g) => ({
    ...g,
    homeTeam: normalizeEplAbbr(g.homeTeam),
    awayTeam: normalizeEplAbbr(g.awayTeam),
  }));

  const stats = rebuildFromLogs(logs, seed);
  fs.writeFileSync(statsPath, `${JSON.stringify(stats, null, 2)}\n`);
  fs.writeFileSync(
    logsPath,
    `${JSON.stringify(
      { ...raw, games: logs, lastUpdated: new Date().toISOString() },
      null,
      2,
    )}\n`,
  );

  const nba = loadGameLogs("NBA");
  const nhl = loadGameLogs("NHL");
  const nfl = loadGameLogs("NFL");
  const eplGames = logs.map((g) => ({
    gameId: g.gameId,
    date: g.date,
    season: g.season,
    league: "EPL" as const,
    homeTeam: g.homeTeam,
    awayTeam: g.awayTeam,
    homeScore: g.homeScore,
    awayScore: g.awayScore,
    totalPoints: g.totalPoints,
    totalFouls: g.totalFouls,
    closingTotal: g.closingTotal,
    homeSpread: g.homeSpread,
    lineSource: g.lineSource,
    officials: g.officials,
  }));
  const file = buildBaselinesFile(
    nba?.games ?? [],
    nhl?.games ?? [],
    "Computed from exported game logs (NBA, NHL, NFL, EPL)",
    nfl?.games ?? [],
    eplGames,
  );
  saveBaselines(file);

  console.log(
    `Normalized ${logs.length} games → ${stats.refs.length} refs, ` +
      `${Object.keys(stats.teamSplits).length}/20 team splits`,
  );
}

main();

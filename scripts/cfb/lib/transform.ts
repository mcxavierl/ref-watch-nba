import { crewKey, refSlug } from "../../lib/slug";
import { dedupeRefsInPlace } from "../../lib/merge-duplicate-refs";
import {
  collectRefTeamStats,
  pushRefTeamGame,
  type RefTeamGameRow,
} from "../../lib/ref-team-stats";
import { FALLBACK_CFB } from "../../lib/baselines";
import { resolveGameConferenceTerritory } from "../../../src/lib/ncaa-conference-gate";
import { CFB_TEAM_ABBRS } from "../../../src/lib/cfb/teams";
import type {
  RefGameRecord,
  RefOfficial,
  RefProfile,
  RefStatsFile,
  TeamCrewSplit,
} from "../../../src/lib/types";
import type { CfbExtractedGame } from "./types";
import type { CfbGameSummary } from "./espn";
import type { FetchedOfficial } from "./fetch-officials";

export type CfbGameLogEntry = {
  gameId: string;
  date: string;
  season: string;
  league: "CFB";
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
  lineSource: "external" | "synthetic";
  officials: RefOfficial[];
};

type TeamGameRow = {
  totalPoints: number;
  totalFouls: number;
  overHit: boolean;
  teamFlags: number;
  opponentFlags: number;
  teamWin: boolean;
  isHome: boolean;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function mergeRefereeData(
  summary: CfbGameSummary,
  fetched: FetchedOfficial[],
  roster: Map<string, number>,
): RefOfficial[] {
  return fetched.map((official) => {
    const key = official.name.toLowerCase().replace(/[^a-z\s]/g, "").trim();
    const number =
      official.number ??
      roster.get(key) ??
      (() => {
        const next = roster.size + 1;
        roster.set(key, next);
        return next;
      })();
    roster.set(key, number);
    return {
      name: official.name,
      number,
      role: "referee" as const,
    };
  });
}

export function summaryToExtractedGame(
  summary: CfbGameSummary,
  officials: FetchedOfficial[],
): CfbExtractedGame {
  const conference = resolveGameConferenceTerritory(
    "cfb",
    summary.homeAbbr,
    summary.awayAbbr,
  );
  return {
    gameId: summary.gameId,
    date: summary.date,
    season: summary.season,
    homeTeam: summary.homeAbbr,
    awayTeam: summary.awayAbbr,
    conference,
    totalPoints: summary.homeScore + summary.awayScore,
    totalFouls: summary.homeFlags + summary.awayFlags,
    officials: officials.map((o) => ({
      name: o.name,
      number: o.number,
      role: o.role,
    })),
  };
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
  const avgTeamFouls = games.reduce((s, g) => s + g.teamFlags, 0) / n;
  const avgOpponentFouls = games.reduce((s, g) => s + g.opponentFlags, 0) / n;

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

export function buildRefStatsFromGames(input: {
  gameLogs: CfbGameLogEntry[];
  roster: Map<string, number>;
}): RefStatsFile {
  const refGames = new Map<string, RefGameRecord[]>();
  const refMeta = new Map<string, { name: string; number: number }>();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const teamByCrew = new Map<
    string,
    Map<string, { crewNames: string[]; games: TeamGameRow[] }>
  >();

  for (const abbr of CFB_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }

  for (const game of input.gameLogs) {
    if (game.officials.length === 0) continue;

    const totalPoints = game.totalPoints;
    const totalFouls = game.totalFouls;
    const overHit = totalPoints > game.closingTotal;

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
      homeFlags: game.homeFlags,
      awayFlags: game.awayFlags,
      homePenaltyYards: game.homePenaltyYards,
      awayPenaltyYards: game.awayPenaltyYards,
      closingTotal: game.closingTotal,
      homeSpread: game.homeSpread,
    };

    const key = crewKey(game.officials);
    const crewNames = game.officials.map((o) => o.name);

    const makeRow = (teamAbbr: string): TeamGameRow | null => {
      if (!CFB_TEAM_ABBRS.includes(teamAbbr)) return null;
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
        teamFlags: isHome ? game.homeFlags : game.awayFlags,
        opponentFlags: isHome ? game.awayFlags : game.homeFlags,
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
          foulDifferential: row.teamFlags - row.opponentFlags,
          totalPoints: row.totalPoints,
          overHit: row.overHit,
          teamWin: row.teamWin,
        });
      }
    }
  }

  const allGameRecords = [...refGames.values()].flat();
  const leagueAvgTotal =
    allGameRecords.length > 0
      ? allGameRecords.reduce((s, g) => s + g.totalPoints, 0) / allGameRecords.length
      : FALLBACK_CFB.leagueAvgTotal;
  const leagueAvgFouls =
    allGameRecords.length > 0
      ? allGameRecords.reduce((s, g) => s + g.totalFouls, 0) / allGameRecords.length
      : FALLBACK_CFB.leagueAvgFouls;

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
      cfbAnalytics: {
        avgFlagsPerGame: round1(avgFouls),
        flagsDelta: round1(avgFouls - leagueAvgFouls),
        avgPenaltyYardsPerGame: round1(avgFouls * 6),
        penaltyYardsDelta: 0,
        avgFlagImbalance: 0,
        balancedGameRate: 0.5,
        balanceKind: "balancer",
      },
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

  const seasons = [...new Set(input.gameLogs.map((g) => g.season))].sort();
  const dates = input.gameLogs.map((g) => g.date).sort();
  const withOfficials = input.gameLogs.filter((g) => g.officials.length > 0).length;

  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons,
      leagueAvgTotal: round1(leagueAvgTotal),
      leagueAvgFouls: round1(leagueAvgFouls),
      leagueOverBaseline: round1(FALLBACK_CFB.leagueOverBaseline),
      leagueAvgPenaltyYards: FALLBACK_CFB.leagueAvgPenaltyYards,
      minSampleSize: 30,
      source: "espn",
      data_verified: true,
      data_source: "ESPN",
      atsAvailable: false,
      refCount: refs.length,
      totalGamesProcessed: input.gameLogs.length,
      dateRange: {
        earliest: dates[0] ?? "",
        latest: dates.at(-1) ?? "",
      },
      note:
        `Scores and penalties from ESPN (${input.gameLogs.length} live-conference games, ${withOfficials} with officials). ` +
        `Coverage: ${seasons.join(", ") || "n/a"}. ` +
        (refs.length === 0
          ? "Official crews unavailable from ESPN CFB summaries - ref×team matrix pending officials source."
          : `${refs.length} officials with game-level crew assignments.`),
    },
    refs,
    teamSplits,
  };
}

export function gameLogFromSummary(
  summary: CfbGameSummary,
  officials: RefOfficial[],
): CfbGameLogEntry {
  return {
    gameId: summary.gameId,
    date: summary.date,
    season: summary.season,
    league: "CFB",
    homeTeam: summary.homeAbbr,
    awayTeam: summary.awayAbbr,
    homeScore: summary.homeScore,
    awayScore: summary.awayScore,
    totalPoints: summary.homeScore + summary.awayScore,
    totalFouls: summary.homeFlags + summary.awayFlags,
    homeFlags: summary.homeFlags,
    awayFlags: summary.awayFlags,
    homePenaltyYards: summary.homePenaltyYards,
    awayPenaltyYards: summary.awayPenaltyYards,
    closingTotal: summary.closingTotal,
    homeSpread: summary.homeSpread,
    lineSource: summary.lineSource,
    officials,
  };
}

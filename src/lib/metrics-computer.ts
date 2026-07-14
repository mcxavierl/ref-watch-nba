import { getTeam as getCbbTeam } from "@/lib/cbb/teams";
import { getTeam as getCfbTeam } from "@/lib/cfb/teams";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { NcaaConferenceTerritory } from "@/lib/ncaa-pipeline";
import { resolveGameConferenceTerritory } from "@/lib/ncaa-pipeline";
import type { RefStatsFile } from "@/lib/types";

export const NCAA_MIN_OUTLIER_GAMES = 20;

export type NcaaMetricsLeague = "cbb" | "cfb";

export interface ConferenceBaselineMetrics {
  conference: NcaaConferenceTerritory;
  games: number;
  avgTotalPoints: number;
  avgFouls: number;
  avgHomeFouls: number;
  avgAwayFouls: number;
  avgFlags: number;
  avgHomeFlags: number;
  avgAwayFlags: number;
  avgPenaltyYards: number;
  foulDifferentialVariance: number;
}

export interface LeagueBaselineMetrics {
  games: number;
  avgTotalPoints: number;
  avgFouls: number;
  avgHomeFouls: number;
  avgAwayFouls: number;
  avgFlags: number;
  avgHomeFlags: number;
  avgAwayFlags: number;
  avgPenaltyYards: number;
}

export interface MetricsComputerResult {
  league: LeagueBaselineMetrics;
  byConference: Record<NcaaConferenceTerritory, ConferenceBaselineMetrics>;
}

type ExtendedGame = RuntimeGameLogEntry & {
  homeFouls?: number;
  awayFouls?: number;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squared = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  return squared / values.length;
}

function foulSplit(game: ExtendedGame): { home: number; away: number } {
  if (game.homeFouls !== undefined && game.awayFouls !== undefined) {
    return { home: game.homeFouls, away: game.awayFouls };
  }
  const half = game.totalFouls / 2;
  return { home: half, away: half };
}

function flagSplit(game: RuntimeGameLogEntry): { home: number; away: number } | null {
  if (game.homeFlags === undefined || game.awayFlags === undefined) return null;
  return { home: game.homeFlags, away: game.awayFlags };
}

type Accumulator = {
  games: number;
  totalPoints: number;
  totalFouls: number;
  homeFouls: number;
  awayFouls: number;
  flagGames: number;
  totalFlags: number;
  homeFlags: number;
  awayFlags: number;
  penaltyYardGames: number;
  totalPenaltyYards: number;
  foulDifferentials: number[];
};

function emptyAccumulator(): Accumulator {
  return {
    games: 0,
    totalPoints: 0,
    totalFouls: 0,
    homeFouls: 0,
    awayFouls: 0,
    flagGames: 0,
    totalFlags: 0,
    homeFlags: 0,
    awayFlags: 0,
    penaltyYardGames: 0,
    totalPenaltyYards: 0,
    foulDifferentials: [],
  };
}

function pushGame(bucket: Accumulator, game: ExtendedGame): void {
  const fouls = foulSplit(game);
  const flags = flagSplit(game);
  bucket.games += 1;
  bucket.totalPoints += game.totalPoints;
  bucket.totalFouls += game.totalFouls;
  bucket.homeFouls += fouls.home;
  bucket.awayFouls += fouls.away;
  bucket.foulDifferentials.push(fouls.away - fouls.home);

  if (flags) {
    bucket.flagGames += 1;
    bucket.totalFlags += flags.home + flags.away;
    bucket.homeFlags += flags.home;
    bucket.awayFlags += flags.away;
  }

  if (game.homePenaltyYards !== undefined && game.awayPenaltyYards !== undefined) {
    bucket.penaltyYardGames += 1;
    bucket.totalPenaltyYards += game.homePenaltyYards + game.awayPenaltyYards;
  }
}

function finalizeAccumulator(
  conference: NcaaConferenceTerritory,
  bucket: Accumulator,
): ConferenceBaselineMetrics {
  const games = bucket.games;
  const flagGames = bucket.flagGames || 1;
  const yardGames = bucket.penaltyYardGames || 1;
  return {
    conference,
    games,
    avgTotalPoints: games > 0 ? round1(bucket.totalPoints / games) : 0,
    avgFouls: games > 0 ? round1(bucket.totalFouls / games) : 0,
    avgHomeFouls: games > 0 ? round1(bucket.homeFouls / games) : 0,
    avgAwayFouls: games > 0 ? round1(bucket.awayFouls / games) : 0,
    avgFlags: bucket.flagGames > 0 ? round1(bucket.totalFlags / flagGames) : 0,
    avgHomeFlags:
      bucket.flagGames > 0 ? round1(bucket.homeFlags / flagGames) : 0,
    avgAwayFlags:
      bucket.flagGames > 0 ? round1(bucket.awayFlags / flagGames) : 0,
    avgPenaltyYards:
      bucket.penaltyYardGames > 0
        ? round1(bucket.totalPenaltyYards / yardGames)
        : 0,
    foulDifferentialVariance: round3(variance(bucket.foulDifferentials)),
  };
}

const NCAA_CONFERENCES: NcaaConferenceTerritory[] = [
  "ACC",
  "Big Ten",
  "Big 12",
  "SEC",
  "Big East",
  "Pac-12",
  "Other",
];

export function isNcaaMetricsLeague(
  leagueId: string,
): leagueId is NcaaMetricsLeague {
  return leagueId === "cbb" || leagueId === "cfb";
}

/** Primary conference bucket for a game (home conference preferred). */
export function conferenceForGame(
  game: RuntimeGameLogEntry,
  league: NcaaMetricsLeague,
): NcaaConferenceTerritory {
  return resolveGameConferenceTerritory(league, game.homeTeam, game.awayTeam);
}

/** Aggregate league-wide and per-conference baselines from scoped game logs. */
export function computeMetricsBaselines(
  games: RuntimeGameLogEntry[],
  league: NcaaMetricsLeague,
): MetricsComputerResult {
  const leagueBucket = emptyAccumulator();
  const conferenceBuckets = new Map<NcaaConferenceTerritory, Accumulator>();
  for (const conference of NCAA_CONFERENCES) {
    conferenceBuckets.set(conference, emptyAccumulator());
  }

  for (const game of games) {
    pushGame(leagueBucket, game as ExtendedGame);
    const conference = conferenceForGame(game, league);
    const bucket = conferenceBuckets.get(conference) ?? emptyAccumulator();
    pushGame(bucket, game as ExtendedGame);
    conferenceBuckets.set(conference, bucket);
  }

  const byConference = {} as Record<NcaaConferenceTerritory, ConferenceBaselineMetrics>;
  for (const conference of NCAA_CONFERENCES) {
    byConference[conference] = finalizeAccumulator(
      conference,
      conferenceBuckets.get(conference) ?? emptyAccumulator(),
    );
  }

  const leagueMetrics = finalizeAccumulator("Other", leagueBucket);
  return {
    league: {
      games: leagueMetrics.games,
      avgTotalPoints: leagueMetrics.avgTotalPoints,
      avgFouls: leagueMetrics.avgFouls,
      avgHomeFouls: leagueMetrics.avgHomeFouls,
      avgAwayFouls: leagueMetrics.avgAwayFouls,
      avgFlags: leagueMetrics.avgFlags,
      avgHomeFlags: leagueMetrics.avgHomeFlags,
      avgAwayFlags: leagueMetrics.avgAwayFlags,
      avgPenaltyYards: leagueMetrics.avgPenaltyYards,
    },
    byConference,
  };
}

export function conferenceBaselineForGame(
  baselines: MetricsComputerResult,
  game: RuntimeGameLogEntry,
  league: NcaaMetricsLeague,
): ConferenceBaselineMetrics {
  const conference = conferenceForGame(game, league);
  return baselines.byConference[conference];
}

/** Apply conference-adjusted league meta for NCAA scoped stats. */
export function applyConferenceAdjustedMeta(
  stats: RefStatsFile,
  games: RuntimeGameLogEntry[],
  league: NcaaMetricsLeague,
): RefStatsFile {
  if (games.length === 0) return stats;
  const computed = computeMetricsBaselines(games, league);
  return {
    ...stats,
    meta: {
      ...stats.meta,
      leagueAvgTotal: computed.league.avgTotalPoints,
      leagueAvgFouls: computed.league.avgFouls,
      leagueOverBaseline: computed.league.avgTotalPoints,
      leagueAvgPenaltyYards:
        computed.league.avgPenaltyYards || stats.meta.leagueAvgPenaltyYards,
      conferenceBaselines: computed.byConference,
    },
  };
}

/** Conference for a team abbreviation when known. */
export function teamConference(
  teamAbbr: string,
  league: NcaaMetricsLeague,
): NcaaConferenceTerritory | null {
  const lookup = league === "cbb" ? getCbbTeam : getCfbTeam;
  return lookup(teamAbbr.toUpperCase())?.conference ?? null;
}

export function clearedOutlierGate(games: number): boolean {
  return games >= NCAA_MIN_OUTLIER_GAMES;
}

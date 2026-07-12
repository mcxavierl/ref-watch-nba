import { loadRuntimeGameLogs, type RuntimeGameLogEntry } from "@/lib/game-logs";
import type { LeagueId } from "@/lib/leagues";
import {
  needsGameLogRebuild,
  type SeasonScopeContext,
  type SeasonScopeMode,
} from "@/lib/season-scope";
import type {
  RefGameRecord,
  RefProfile,
  RefStatsFile,
  RefTeamStat,
  TeamCrewSplit,
} from "@/lib/types";

type DataLeague = "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";

const LEAGUE_ID_TO_DATA: Record<LeagueId, DataLeague> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  cbb: "CBB",
  cfb: "CFB",
  wnba: "NBA",
  mlb: "NBA",
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

function crewKey(officials: { name: string; number: number }[]): string {
  return officials
    .map((o) => refSlug(o.name, o.number))
    .sort()
    .join("|");
}

interface RefTeamGameRow {
  foulDifferential: number;
  totalPoints: number;
  overHit: boolean;
  teamWin: boolean;
}

interface TeamCrewGameRow {
  isHome: boolean;
  teamWin: boolean;
  totalPoints: number;
  totalFouls: number;
  teamFouls: number;
  opponentFouls: number;
  overHit: boolean;
}

function teamFoulSplit(
  game: RuntimeGameLogEntry,
  isHome: boolean,
): { teamFouls: number; opponentFouls: number } {
  if (game.homeFlags !== undefined && game.awayFlags !== undefined) {
    return isHome
      ? { teamFouls: game.homeFlags, opponentFouls: game.awayFlags }
      : { teamFouls: game.awayFlags, opponentFouls: game.homeFlags };
  }
  if (game.homeMinors !== undefined && game.awayMinors !== undefined) {
    return isHome
      ? { teamFouls: game.homeMinors, opponentFouls: game.awayMinors }
      : { teamFouls: game.awayMinors, opponentFouls: game.homeMinors };
  }
  const half = game.totalFouls / 2;
  return { teamFouls: half, opponentFouls: half };
}

function buildRefTeamStat(games: RefTeamGameRow[]): RefTeamStat {
  const n = games.length;
  const wins = games.filter((g) => g.teamWin).length;
  const losses = n - wins;
  return {
    games: n,
    wins,
    losses,
    avgFoulDifferential: round1(
      games.reduce((s, g) => s + g.foulDifferential, 0) / n,
    ),
    avgTotalPoints: round1(
      games.reduce((s, g) => s + g.totalPoints, 0) / n,
    ),
    overRate: round3(games.filter((g) => g.overHit).length / n),
    winRate: round3(wins / n),
  };
}

function buildTeamSplit(
  key: string,
  crewNames: string[],
  games: TeamCrewGameRow[],
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
    totalDelta: round1(avgTotal),
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

function toRecentGame(
  game: RuntimeGameLogEntry,
  overHit: boolean,
): RefGameRecord {
  return {
    gameId: game.gameId,
    date: game.date,
    season: game.season,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    totalPoints: game.totalPoints,
    totalFouls: game.totalFouls,
    overHit,
    raptorsInvolved:
      game.homeTeam === "TOR" || game.awayTeam === "TOR",
    homeMinors: game.homeMinors,
    awayMinors: game.awayMinors,
    homeFlags: game.homeFlags,
    awayFlags: game.awayFlags,
    homePenaltyYards: game.homePenaltyYards,
    awayPenaltyYards: game.awayPenaltyYards,
  };
}

function rebuildFromGameLogs(
  base: RefStatsFile,
  games: RuntimeGameLogEntry[],
  scopedSeasons: string[],
  options?: { focusTeamAbbr?: string },
): RefStatsFile {
  const seasonSet = new Set(scopedSeasons);
  let filtered = games.filter((g) => seasonSet.has(g.season));
  const focusTeam = options?.focusTeamAbbr?.toUpperCase();
  if (focusTeam) {
    filtered = filtered.filter(
      (g) => g.homeTeam === focusTeam || g.awayTeam === focusTeam,
    );
  }
  if (filtered.length === 0) {
    return filterByRefSeasons(base, scopedSeasons);
  }

  const leagueAvgTotal =
    filtered.reduce((s, g) => s + g.totalPoints, 0) / filtered.length;
  const leagueAvgFouls =
    filtered.reduce((s, g) => s + g.totalFouls, 0) / filtered.length;
  const leagueOverBaseline = leagueAvgTotal;

  const refGames = new Map<string, RefGameRecord[]>();
  const refMeta = new Map<string, { name: string; number: number }>();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const teamByCrew = new Map<string, Map<string, { crewNames: string[]; games: TeamCrewGameRow[] }>>();

  for (const game of filtered) {
    const overHit = game.totalPoints > game.closingTotal;
    const homeWin = game.homeScore > game.awayScore;
    const key = crewKey(game.officials);
    const crewNames = game.officials.map((o) => o.name);

    for (const [teamAbbr, teamWin, isHome] of [
      [game.homeTeam, homeWin, true],
      [game.awayTeam, !homeWin, false],
    ] as const) {
      const fouls = teamFoulSplit(game, isHome);
      const teamMap = teamByCrew.get(teamAbbr) ?? new Map();
      const bucket = teamMap.get(key) ?? { crewNames, games: [] };
      bucket.games.push({
        isHome,
        teamWin,
        totalPoints: game.totalPoints,
        totalFouls: game.totalFouls,
        teamFouls: fouls.teamFouls,
        opponentFouls: fouls.opponentFouls,
        overHit,
      });
      teamMap.set(key, bucket);
      teamByCrew.set(teamAbbr, teamMap);
    }

    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      if (!refMeta.has(slug)) {
        refMeta.set(slug, { name: official.name, number: official.number });
      }

      const recent = toRecentGame(game, overHit);
      const existing = refGames.get(slug) ?? [];
      existing.push(recent);
      refGames.set(slug, existing);

      for (const [teamAbbr, teamWin, isHome] of [
        [game.homeTeam, homeWin, true],
        [game.awayTeam, !homeWin, false],
      ] as const) {
        const fouls = teamFoulSplit(game, isHome);
        const row: RefTeamGameRow = {
          foulDifferential: fouls.teamFouls - fouls.opponentFouls,
          totalPoints: game.totalPoints,
          overHit,
          teamWin,
        };
        const byTeam = refTeamBuckets.get(slug) ?? new Map();
        const teamRows = byTeam.get(teamAbbr) ?? [];
        teamRows.push(row);
        byTeam.set(teamAbbr, teamRows);
        refTeamBuckets.set(slug, byTeam);
      }
    }
  }

  const baseBySlug = new Map(base.refs.map((r) => [r.slug, r]));
  const refs: RefProfile[] = [];

  for (const [slug, gameRecords] of refGames) {
    const meta = refMeta.get(slug)!;
    const n = gameRecords.length;
    const avgTotal = gameRecords.reduce((s, g) => s + g.totalPoints, 0) / n;
    const avgFouls = gameRecords.reduce((s, g) => s + g.totalFouls, 0) / n;
    const overRate = gameRecords.filter((g) => g.overHit).length / n;
    const seasons = [...new Set(gameRecords.map((g) => g.season))].sort();
    const byTeam = refTeamBuckets.get(slug);
    const teamStats = byTeam
      ? Object.fromEntries(
          [...byTeam.entries()]
            .filter(([team]) => !focusTeam || team === focusTeam)
            .map(([team, rows]) => [team, buildRefTeamStat(rows)]),
        )
      : {};

    const preserved = baseBySlug.get(slug);
    refs.push({
      slug,
      name: meta.name,
      number: meta.number,
      role: preserved?.role,
      games: n,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      homeCoverRate: preserved?.homeCoverRate ?? null,
      totalPointsDelta: round1(avgTotal - leagueAvgTotal),
      foulsDelta: round1(avgFouls - leagueAvgFouls),
      seasons,
      recentGames: gameRecords.slice(-8).reverse(),
      teamStats,
      bettingStats: preserved?.bettingStats,
      nhlAnalytics: preserved?.nhlAnalytics,
      nflAnalytics: preserved?.nflAnalytics,
      cfbAnalytics: preserved?.cfbAnalytics,
      eplAnalytics: preserved?.eplAnalytics,
      provenance: preserved?.provenance,
    });
  }

  refs.sort((a, b) => b.games - a.games);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  for (const [teamAbbr, crewMap] of teamByCrew) {
    if (focusTeam && teamAbbr !== focusTeam) continue;
    teamSplits[teamAbbr] = [...crewMap.entries()]
      .map(([k, data]) => buildTeamSplit(k, data.crewNames, data.games))
      .sort((a, b) => b.games - a.games);
  }

  const dates = filtered.map((g) => g.date).sort();

  return {
    ...base,
    meta: {
      ...base.meta,
      seasons: scopedSeasons,
      leagueAvgTotal: round1(leagueAvgTotal),
      leagueAvgFouls: round1(leagueAvgFouls),
      leagueOverBaseline: round1(leagueOverBaseline),
      refCount: refs.length,
      totalGamesProcessed: filtered.length,
      dateRange: {
        earliest: dates[0] ?? base.meta.dateRange?.earliest ?? "",
        latest: dates[dates.length - 1] ?? base.meta.dateRange?.latest ?? "",
      },
    },
    refs,
    teamSplits,
  };
}

function filterByRefSeasons(
  base: RefStatsFile,
  scopedSeasons: string[],
): RefStatsFile {
  const seasonSet = new Set(scopedSeasons);
  const refs = base.refs.filter((ref) =>
    ref.seasons.some((s) => seasonSet.has(s)),
  );
  return {
    ...base,
    meta: {
      ...base.meta,
      seasons: scopedSeasons,
      refCount: refs.length,
    },
    refs,
  };
}

/** Season-filter refs but keep bundled team splits (Worker-safe for NFL hubs). */
function filterStatsPreservingTeamSplits(
  base: RefStatsFile,
  scopedSeasons: string[],
): RefStatsFile {
  return { ...filterByRefSeasons(base, scopedSeasons), teamSplits: base.teamSplits };
}

type ScopedRebuildOptions = {
  scopeMode?: SeasonScopeMode;
  teamAbbr?: string;
};

const SCOPED_STATS_CACHE_KEY = "__REFWATCH_SCOPED_STATS_CACHE__" as const;
const SCOPED_STATS_CACHE_MAX = 12;

function scopedStatsCache(): Map<string, RefStatsFile> {
  const g = globalThis as typeof globalThis & {
    [SCOPED_STATS_CACHE_KEY]?: Map<string, RefStatsFile>;
  };
  if (!g[SCOPED_STATS_CACHE_KEY]) {
    g[SCOPED_STATS_CACHE_KEY] = new Map();
  }
  return g[SCOPED_STATS_CACHE_KEY]!;
}

function scopedStatsCacheKey(
  leagueId: LeagueId,
  scopedSeasons: string[],
  options?: ScopedRebuildOptions,
): string {
  return [
    leagueId,
    options?.scopeMode ?? "",
    options?.teamAbbr?.toUpperCase() ?? "",
    [...scopedSeasons].sort().join(","),
  ].join("|");
}

function baseHasTeamStats(base: RefStatsFile): boolean {
  return base.refs.some(
    (ref) => ref.teamStats && Object.keys(ref.teamStats).length > 0,
  );
}

export function buildScopedRefStats(
  leagueId: LeagueId,
  base: RefStatsFile,
  scopedSeasons: string[],
  options?: ScopedRebuildOptions,
): RefStatsFile {
  const allSeasons = base.meta.seasons;
  const sortedAll = [...allSeasons].sort();
  const sortedScoped = [...scopedSeasons].sort();
  if (
    sortedAll.length > 0 &&
    sortedScoped.length === sortedAll.length &&
    sortedScoped.every((s, i) => s === sortedAll[i])
  ) {
    return base;
  }

  const context: SeasonScopeContext | undefined = options?.teamAbbr
    ? { teamAbbr: options.teamAbbr }
    : undefined;
  const scopeMode = options?.scopeMode;
  const cacheKey = scopedStatsCacheKey(leagueId, scopedSeasons, options);
  const cached = scopedStatsCache().get(cacheKey);
  if (cached) return cached;

  const isProperSubset =
    sortedScoped.length > 0 && sortedScoped.length < sortedAll.length;
  const dataLeague = LEAGUE_ID_TO_DATA[leagueId];
  const logs = loadRuntimeGameLogs(dataLeague);

  const shouldRebuildFromLogs = (() => {
    if (!logs?.games?.length || !isProperSubset) return false;
    if (leagueId === "nfl") {
      if (!scopeMode) return false;
      return needsGameLogRebuild(leagueId, scopeMode, context);
    }
    if (leagueId === "nba") return true;
    return !baseHasTeamStats(base);
  })();

  let result: RefStatsFile;
  if (shouldRebuildFromLogs) {
    result = rebuildFromGameLogs(base, logs!.games, scopedSeasons, {
      focusTeamAbbr: context?.teamAbbr,
    });
  } else if (leagueId === "nfl") {
    result = filterStatsPreservingTeamSplits(base, scopedSeasons);
  } else {
    result = filterByRefSeasons(base, scopedSeasons);
  }

  scopedStatsCache().set(cacheKey, result);
  if (scopedStatsCache().size > SCOPED_STATS_CACHE_MAX) {
    const oldest = scopedStatsCache().keys().next().value;
    if (oldest) scopedStatsCache().delete(oldest);
  }
  return result;
}

export function scopedBaselinesSeasons(
  allSeasons: Record<string, unknown>,
  scopedSeasons: string[],
): Record<string, unknown> {
  const seasonSet = new Set(scopedSeasons);
  return Object.fromEntries(
    Object.entries(allSeasons).filter(
      ([key]) => key === "all" || seasonSet.has(key),
    ),
  );
}

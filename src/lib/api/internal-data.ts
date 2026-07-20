/**
 * Internal data access for SSR, server components, and ingest jobs.
 *
 * Website routes import league loaders directly (`@/lib/load-league-stats`, etc.)
 * and never pass through `/api/v1`. This module is the shared internal boundary
 * reused by programmatic API handlers so both paths read the same JSON cache
 * without API keys or HTTP self-fetch.
 */
import { loadLeagueStats } from "@/lib/load-league-stats";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export function isPublicApiLeagueId(value: string): value is LeagueId {
  return value in LEAGUES;
}

export function getLeagueStatsInternal(leagueId: LeagueId): RefStatsFile {
  return loadLeagueStats(leagueId).stats;
}

/** Slim ref index for external API payloads (no team splits or recent game logs). */
export function stripRefForApi(ref: RefProfile): Pick<
  RefProfile,
  | "slug"
  | "name"
  | "number"
  | "games"
  | "avgTotalPoints"
  | "overRate"
  | "avgFouls"
  | "totalPointsDelta"
  | "foulsDelta"
  | "homeCoverRate"
> {
  return {
    slug: ref.slug,
    name: ref.name,
    number: ref.number,
    games: ref.games,
    avgTotalPoints: ref.avgTotalPoints,
    overRate: ref.overRate,
    avgFouls: ref.avgFouls,
    totalPointsDelta: ref.totalPointsDelta,
    foulsDelta: ref.foulsDelta,
    homeCoverRate: ref.homeCoverRate,
  };
}

export function buildLeagueStatsApiPayload(leagueId: LeagueId) {
  const stats = getLeagueStatsInternal(leagueId);
  const league = LEAGUES[leagueId];

  return {
    league: {
      id: leagueId,
      label: league.label,
      dataLeague: league.dataLeague,
    },
    meta: {
      lastUpdated: stats.meta.lastUpdated,
      seasons: stats.meta.seasons,
      refCount: stats.refs.length,
      totalGamesProcessed: stats.meta.totalGamesProcessed ?? null,
      dataVerified: stats.meta.data_verified ?? false,
      leagueAvgTotal: stats.meta.leagueAvgTotal,
      leagueAvgFouls: stats.meta.leagueAvgFouls,
      leagueOverBaseline: stats.meta.leagueOverBaseline,
    },
  };
}

export function buildLeagueRefsApiPayload(leagueId: LeagueId, limit = 100) {
  const stats = getLeagueStatsInternal(leagueId);
  const refs = stats.refs
    .slice()
    .sort((a, b) => b.games - a.games)
    .slice(0, Math.max(1, Math.min(limit, 500)))
    .map(stripRefForApi);

  return {
    league: leagueId,
    count: refs.length,
    refs,
  };
}

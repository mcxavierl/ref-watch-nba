import {
  generateOII,
  OII_MIN_SAMPLE,
  OII_MOVERS_WINDOW_DAYS,
} from "@/lib/officiating-intelligence-index";
import { loadLeagueStats } from "@/lib/load-league-stats";
import {
  DASHBOARD_GRID_LEAGUE_IDS,
  isDashboardLeagueExposed,
  isLeagueAnalyticsUnlocked,
} from "@/config/leagues";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import type { RefGameRecord, RefProfile } from "@/lib/types";

export { OII_MOVERS_WINDOW_DAYS };

export type OiiMoverEntry = {
  slug: string;
  name: string;
  leagueId: LeagueId;
  leagueLabel: string;
  href: string;
  currentScore: number;
  priorScore: number;
  delta: number;
  recentGamesInWindow: number;
};

export type OiiMoversSnapshot = {
  asOfDate: string;
  windowDays: number;
  movers: OiiMoverEntry[];
};

function refHref(leagueId: LeagueId, slug: string): string {
  return `${LEAGUES[leagueId].pathPrefix}/refs/${slug}`;
}

/** Parse YYYY-MM-DD game dates from ref-stats logs. */
export function parseRefGameDate(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatRefGameDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Latest game date across refs; falls back to today when logs are empty. */
export function resolveOiiMoversAsOfDate(refs: readonly RefProfile[]): Date {
  let latest: Date | null = null;
  for (const ref of refs) {
    for (const game of ref.recentGames) {
      const parsed = parseRefGameDate(game.date);
      if (!parsed) continue;
      if (!latest || parsed > latest) latest = parsed;
    }
  }
  return latest ?? new Date();
}

export function cutoffDateForOiiMovers(
  asOf: Date,
  windowDays = OII_MOVERS_WINDOW_DAYS,
): string {
  const cutoff = new Date(asOf);
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
  return formatRefGameDate(cutoff);
}

export function gamesWithinOiiMoversWindow(
  games: readonly RefGameRecord[],
  cutoffDate: string,
): RefGameRecord[] {
  return games.filter((game) => game.date >= cutoffDate);
}

export function gamesBeforeOiiMoversWindow(
  games: readonly RefGameRecord[],
  cutoffDate: string,
): RefGameRecord[] {
  return games.filter((game) => game.date < cutoffDate);
}

export function computeRefOiiMoverDelta(
  ref: RefProfile,
  leagueAvgFouls: number | undefined,
  cutoffDate: string,
): { currentScore: number; priorScore: number; delta: number; recentGamesInWindow: number } | null {
  if (!Number.isFinite(ref.games) || ref.games < OII_MIN_SAMPLE) return null;

  const recentInWindow = gamesWithinOiiMoversWindow(ref.recentGames, cutoffDate);
  if (recentInWindow.length === 0) return null;

  const olderGames = gamesBeforeOiiMoversWindow(ref.recentGames, cutoffDate);
  if (olderGames.length < 3) return null;

  const priorSampleSize = Math.max(
    OII_MIN_SAMPLE,
    ref.games - recentInWindow.length,
  );

  const current = generateOII(ref.slug, {
    recentGames: ref.recentGames,
    leagueAvgFouls,
    sampleSize: ref.games,
  });
  const prior = generateOII(ref.slug, {
    recentGames: olderGames,
    leagueAvgFouls,
    sampleSize: priorSampleSize,
  });

  if (current.status !== "ok" || prior.status !== "ok") return null;

  const delta = current.score - prior.score;
  if (delta <= 0) return null;

  return {
    currentScore: current.score,
    priorScore: prior.score,
    delta,
    recentGamesInWindow: recentInWindow.length,
  };
}

/** Top officials with the largest positive OII change in the movers window. */
export function buildOiiMoversSnapshot(limit = 3): OiiMoversSnapshot {
  const candidates: OiiMoverEntry[] = [];
  let asOf = new Date();

  for (const leagueId of DASHBOARD_GRID_LEAGUE_IDS) {
    if (!isDashboardLeagueExposed(leagueId)) continue;
    const { stats } = loadLeagueStats(leagueId);
    if (!isLeagueAnalyticsUnlocked(leagueId, stats)) continue;

    const leagueAsOf = resolveOiiMoversAsOfDate(stats.refs);
    if (leagueAsOf > asOf) asOf = leagueAsOf;

    const cutoffDate = cutoffDateForOiiMovers(leagueAsOf);
    const leagueAvg = stats.meta.leagueAvgFouls;

    for (const ref of stats.refs) {
      const deltaResult = computeRefOiiMoverDelta(ref, leagueAvg, cutoffDate);
      if (!deltaResult) continue;

      candidates.push({
        slug: ref.slug,
        name: ref.name,
        leagueId,
        leagueLabel: LEAGUES[leagueId].shortLabel,
        href: refHref(leagueId, ref.slug),
        currentScore: deltaResult.currentScore,
        priorScore: deltaResult.priorScore,
        delta: deltaResult.delta,
        recentGamesInWindow: deltaResult.recentGamesInWindow,
      });
    }
  }

  candidates.sort((a, b) => b.delta - a.delta || b.currentScore - a.currentScore);

  return {
    asOfDate: formatRefGameDate(asOf),
    windowDays: OII_MOVERS_WINDOW_DAYS,
    movers: candidates.slice(0, limit),
  };
}

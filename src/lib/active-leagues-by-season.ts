import { getLeagueConfigEntry } from "@/config/leagueConfig";
import type { LeagueId } from "@/lib/leagues";
import { LAUNCHED_NCAA_LEAGUE_IDS, VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/verified-live-leagues";

export type ActiveLeagueSeasonInfo = {
  leagueId: LeagueId;
  /** League is inside its configured regular-season calendar window. */
  isLive: boolean;
  /** Next season opener (for offseason ordering). */
  nextSeasonStartMs: number;
};

type SeasonEnd = { month: number; day: number };

/** Approximate regular-season end dates for in-season detection. */
const SEASON_END: Partial<Record<LeagueId, SeasonEnd>> = {
  wnba: { month: 10, day: 20 },
  nba: { month: 6, day: 30 },
  nhl: { month: 6, day: 30 },
  nfl: { month: 2, day: 15 },
  epl: { month: 5, day: 31 },
  laliga: { month: 5, day: 31 },
  cbb: { month: 4, day: 15 },
  cfb: { month: 1, day: 20 },
};

function seasonStartInYear(leagueId: LeagueId, year: number): Date {
  const config = getLeagueConfigEntry(leagueId);
  if (!config) return new Date(Number.MAX_SAFE_INTEGER);
  return new Date(year, config.seasonStartMonth - 1, config.seasonStartDay);
}

function seasonEndInYear(leagueId: LeagueId, year: number): Date {
  const end = SEASON_END[leagueId];
  if (!end) return new Date(year, 11, 31);
  return new Date(year, end.month - 1, end.day, 23, 59, 59, 999);
}

function nextSeasonStartMs(leagueId: LeagueId, referenceDate: Date): number {
  const year = referenceDate.getFullYear();
  const thisYearStart = seasonStartInYear(leagueId, year);
  if (referenceDate < thisYearStart) return thisYearStart.getTime();
  return seasonStartInYear(leagueId, year + 1).getTime();
}

/** True when `referenceDate` falls inside the league's active season window. */
export function isLeagueInSeasonWindow(
  leagueId: LeagueId,
  referenceDate: Date = new Date(),
): boolean {
  const config = getLeagueConfigEntry(leagueId);
  if (!config) return false;

  const year = referenceDate.getFullYear();
  const start = seasonStartInYear(leagueId, year);
  const end = seasonEndInYear(leagueId, year);

  if (start.getTime() <= end.getTime()) {
    return referenceDate >= start && referenceDate <= end;
  }

  // Season spans calendar years (e.g. NBA Oct through June).
  const priorStart = seasonStartInYear(leagueId, year - 1);
  const priorEnd = seasonEndInYear(leagueId, year);
  if (referenceDate >= priorStart && referenceDate <= priorEnd) return true;

  const nextEnd = seasonEndInYear(leagueId, year + 1);
  return referenceDate >= start && referenceDate <= nextEnd;
}

/**
 * Rank verified overview leagues: in-season leagues first, then by next opener.
 */
export function getActiveLeaguesBySeason(
  now: Date = new Date(),
): ActiveLeagueSeasonInfo[] {
  const leagues = [...VERIFIED_LIVE_LEAGUE_IDS] as LeagueId[];

  return leagues
    .map((leagueId) => ({
      leagueId,
      isLive: isLeagueInSeasonWindow(leagueId, now),
      nextSeasonStartMs: nextSeasonStartMs(leagueId, now),
    }))
    .sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      const startDelta = a.nextSeasonStartMs - b.nextSeasonStartMs;
      if (startDelta !== 0) return startDelta;
      return a.leagueId.localeCompare(b.leagueId);
    });
}

/** Homepage hub grid order derived from live season windows. */
export function getOverviewHubLeagueOrder(now: Date = new Date()): LeagueId[] {
  const ordered = getActiveLeaguesBySeason(now).map((entry) => entry.leagueId);
  for (const leagueId of LAUNCHED_NCAA_LEAGUE_IDS) {
    if (!ordered.includes(leagueId)) ordered.push(leagueId);
  }
  return ordered;
}

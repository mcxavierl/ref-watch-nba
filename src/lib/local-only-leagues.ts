import type { LeagueId } from "@/lib/leagues";
import { isShowUnverifiedEnv } from "@/lib/show-unverified";

/** Leagues with in-progress routes that must not ship on refwatch.ca yet. */
export const LOCAL_ONLY_LEAGUE_IDS = ["wnba"] as const satisfies readonly LeagueId[];

export type LocalOnlyLeagueId = (typeof LOCAL_ONLY_LEAGUE_IDS)[number];

export function isLocalOnlyLeague(
  leagueId: LeagueId,
): leagueId is LocalOnlyLeagueId {
  return (LOCAL_ONLY_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

/** True when local WNBA preview routes are allowed (dev or explicit preview flag). */
export function canAccessLocalOnlyLeagues(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return isShowUnverifiedEnv();
}

export function shouldRedirectLocalOnlyLeague(pathname: string): boolean {
  return shouldRedirectLocalOnlyLeagueForAccess(
    pathname,
    canAccessLocalOnlyLeagues(),
  );
}

export function shouldRedirectLocalOnlyLeagueForAccess(
  pathname: string,
  allowAccess: boolean,
): boolean {
  if (allowAccess) return false;
  for (const leagueId of LOCAL_ONLY_LEAGUE_IDS) {
    const prefix = `/${leagueId}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

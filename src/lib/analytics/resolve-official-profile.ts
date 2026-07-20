import { getRefBySlug as getNbaRef, getRefStats as getNbaStats } from "@/lib/data";
import { getRefBySlug as getNflRef, getRefStats as getNflStats } from "@/lib/nfl/data";
import { getRefBySlug as getNhlRef, getRefStats as getNhlStats } from "@/lib/nhl/data";
import { getRefBySlug as getEplRef, getRefStats as getEplStats } from "@/lib/epl/data";
import { getRefBySlug as getLaligaRef, getRefStats as getLaligaStats } from "@/lib/laliga/data";
import { getRefBySlug as getCbbRef, getRefStats as getCbbStats } from "@/lib/cbb/data";
import { getRefBySlug as getCfbRef, getRefStats as getCfbStats } from "@/lib/cfb/data";
import { getRefBySlug as getWnbaRef, getRefStats as getWnbaStats } from "@/lib/wnba/data";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export type ResolvedOfficialProfile = {
  profile: RefProfile;
  stats: RefStatsFile;
  qualified: boolean;
};

const LEAGUE_RESOLVERS: Record<
  LeagueId,
  {
    getRef: (slug: string) => RefProfile | undefined;
    getStats: () => RefStatsFile;
  }
> = {
  nba: { getRef: getNbaRef, getStats: getNbaStats },
  nfl: { getRef: getNflRef, getStats: getNflStats },
  nhl: { getRef: getNhlRef, getStats: getNhlStats },
  epl: { getRef: getEplRef, getStats: getEplStats },
  laliga: { getRef: getLaligaRef, getStats: getLaligaStats },
  cbb: { getRef: getCbbRef, getStats: getCbbStats },
  cfb: { getRef: getCfbRef, getStats: getCfbStats },
  wnba: { getRef: getWnbaRef, getStats: getWnbaStats },
  mlb: {
    getRef: () => undefined,
    getStats: () => {
      throw new Error("MLB scouting reports are not supported");
    },
  },
};

export function resolveOfficialProfile(
  officialId: string,
  leagueId: LeagueId,
): ResolvedOfficialProfile | null {
  const resolver = LEAGUE_RESOLVERS[leagueId];
  const profile = resolver.getRef(officialId);
  if (!profile) return null;

  const stats = resolver.getStats();
  return {
    profile,
    stats,
    qualified: profile.games >= stats.meta.minSampleSize,
  };
}

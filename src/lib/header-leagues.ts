import { HEADER_LEAGUE_IDS, type LeagueId } from "@/lib/leagues";
import { PRODUCTION_LIVE_HEADER_LEAGUE_IDS } from "@/lib/live-header-leagues.generated";
import { isShowUnverifiedEnv } from "@/lib/show-unverified";
import {
  canAccessLocalOnlyLeagues,
  LOCAL_ONLY_LEAGUE_IDS,
} from "@/lib/local-only-leagues";

/** Leagues hidden from nav and section tabs until verified ingest ships. */
export const INGEST_GATED_LEAGUE_IDS = [] as const satisfies readonly LeagueId[];

export type IngestGatedLeagueId = (typeof INGEST_GATED_LEAGUE_IDS)[number];

/** College leagues kept out of the header sport switcher until launched. */
const HEADER_HIDDEN_LEAGUE_IDS: readonly LeagueId[] = ["cfb"];

/** Leagues with verified ingest shown in the header sport switcher. */
export function getHeaderLeagueIds(): LeagueId[] {
  const base =
    isShowUnverifiedEnv() || process.env.NODE_ENV !== "production"
      ? [...HEADER_LEAGUE_IDS]
      : [...PRODUCTION_LIVE_HEADER_LEAGUE_IDS];
  const ids: LeagueId[] = base.filter((id) => !HEADER_HIDDEN_LEAGUE_IDS.includes(id));
  if (canAccessLocalOnlyLeagues()) {
    for (const leagueId of LOCAL_ONLY_LEAGUE_IDS) {
      if (!ids.includes(leagueId)) ids.push(leagueId);
    }
  }
  return ids;
}

export function isIngestGatedLeague(leagueId: LeagueId): leagueId is IngestGatedLeagueId {
  return (INGEST_GATED_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

/** Hide Matrix/Refs/Teams tabs for ingest-gated leagues in production. */
export function isIngestGatedNavHidden(leagueId: LeagueId): boolean {
  if (!isIngestGatedLeague(leagueId)) return false;
  if (isShowUnverifiedEnv()) return false;
  if (process.env.NODE_ENV !== "production") return false;
  return true;
}

/** Hide NHL section nav when NHL is not in the production header (no verified ingest). */
export function isNhlNavHidden(leagueId: LeagueId): boolean {
  if (leagueId !== "nhl") return false;
  if (isShowUnverifiedEnv()) return false;
  if (process.env.NODE_ENV !== "production") return false;
  return !getHeaderLeagueIds().includes("nhl");
}

/** Leagues with nav stubs but no shipped routes yet. */
const UNROUTED_LEAGUE_PREFIXES = ["/mlb"] as const;

/** Hidden league routes redirect to home when ingest is not verified. */
export function shouldRedirectHiddenLeague(pathname: string): boolean {
  return UNROUTED_LEAGUE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

import { HEADER_LEAGUE_IDS, type LeagueId } from "@/lib/leagues";
import { isShowUnverifiedEnv } from "@/lib/show-unverified";

/** Production sport switcher until NHL nhl-api ingest is verified in ref-stats.json. */
const PRODUCTION_LIVE_HEADER_LEAGUE_IDS = ["nba", "epl"] as const satisfies readonly LeagueId[];

/** Leagues hidden from nav and section tabs until verified ingest ships. */
export const INGEST_GATED_LEAGUE_IDS = ["nhl", "nfl"] as const satisfies readonly LeagueId[];

export type IngestGatedLeagueId = (typeof INGEST_GATED_LEAGUE_IDS)[number];

/** Leagues with verified ingest shown in the header sport switcher. */
export function getHeaderLeagueIds(): LeagueId[] {
  if (isShowUnverifiedEnv()) {
    return [...HEADER_LEAGUE_IDS];
  }
  if (process.env.NODE_ENV !== "production") {
    return [...HEADER_LEAGUE_IDS];
  }
  return [...PRODUCTION_LIVE_HEADER_LEAGUE_IDS];
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

/** NFL routes redirect to home in production (no verified ingest yet). */
export function shouldRedirectHiddenLeague(pathname: string): boolean {
  if (isShowUnverifiedEnv()) return false;
  if (process.env.NODE_ENV !== "production") return false;
  return pathname === "/nfl" || pathname.startsWith("/nfl/");
}

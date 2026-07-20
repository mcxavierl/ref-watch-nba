import { getTeam as getCbbTeam } from "@/lib/cbb/teams";
import { getTeam as getCfbTeam } from "@/lib/cfb/teams";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";

type NcaaGameLogRow = {
  homeTeam: string;
  awayTeam: string;
};

const GAME_LOG_GLOBAL_KEYS = {
  CBB: "__REFWATCH_CBB_GAME_LOGS__",
  CFB: "__REFWATCH_CFB_GAME_LOGS__",
} as const;

function readHydratedNcaaGameLogs(
  league: "CBB" | "CFB",
): NcaaGameLogRow[] {
  const key = GAME_LOG_GLOBAL_KEYS[league];
  const file = (globalThis as unknown as Record<
    string,
    { games?: NcaaGameLogRow[] } | undefined
  >)[key];
  return file?.games ?? [];
}

export type NcaaRouteLeague = "cbb" | "cfb";

export type NcaaConferenceTerritory =
  | "ACC"
  | "Big Ten"
  | "Big 12"
  | "SEC"
  | "Big East"
  | "Pac-12"
  | "WCC"
  | "Other";

/**
 * Phased NCAA launch gate — power conferences with verified ESPN crew coverage.
 */
export const LIVE_NCAA_CONFERENCES = [
  "ACC",
  "Big Ten",
  "Big 12",
  "SEC",
  "Big East",
] as const satisfies readonly NcaaConferenceTerritory[];

export type LiveNcaaConferenceId = (typeof LIVE_NCAA_CONFERENCES)[number];

/** Tracked programs outside power conferences with verified crew coverage. */
export const LIVE_NCAA_SUPPLEMENTAL_TEAMS: Record<
  NcaaRouteLeague,
  readonly string[]
> = {
  cbb: ["GONZ"],
  cfb: [],
};

const SUPPLEMENTAL_TEAM_SET: Record<NcaaRouteLeague, Set<string>> = {
  cbb: new Set(LIVE_NCAA_SUPPLEMENTAL_TEAMS.cbb),
  cfb: new Set(LIVE_NCAA_SUPPLEMENTAL_TEAMS.cfb),
};

export function isSupplementalLiveNcaaTeam(
  league: NcaaRouteLeague,
  teamAbbr: string,
): boolean {
  return SUPPLEMENTAL_TEAM_SET[league].has(teamAbbr.toUpperCase());
}

export const NCAA_CONFERENCE_GATED_LEAGUE_IDS = ["cbb", "cfb"] as const satisfies readonly LeagueId[];

const LIVE_CONFERENCE_SET = new Set<string>(LIVE_NCAA_CONFERENCES);

export const NCAA_KEY_CONFERENCES_LABEL = "(Key Conferences)";

export function isNcaaConferenceGatedLeague(
  leagueId: LeagueId,
): leagueId is NcaaRouteLeague {
  return (NCAA_CONFERENCE_GATED_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId);
}

export function isLiveNcaaConference(
  conference: string | null | undefined,
): conference is LiveNcaaConferenceId {
  return Boolean(conference && LIVE_CONFERENCE_SET.has(conference));
}

export function resolveTeamConference(
  league: NcaaRouteLeague,
  teamAbbr: string,
): NcaaConferenceTerritory | null {
  const lookup = league === "cbb" ? getCbbTeam : getCfbTeam;
  return lookup(teamAbbr.toUpperCase())?.conference ?? null;
}

export function resolveGameConferenceTerritory(
  league: NcaaRouteLeague,
  homeTeam: string,
  awayTeam: string,
): NcaaConferenceTerritory {
  const homeConference = resolveTeamConference(league, homeTeam);
  const awayConference = resolveTeamConference(league, awayTeam);
  if (homeConference) return homeConference;
  if (awayConference) return awayConference;
  return "Other";
}

/** True when either side maps to a live conference bucket. */
export function gameTouchesLiveNcaaConference(
  league: NcaaRouteLeague,
  homeTeam: string,
  awayTeam: string,
): boolean {
  const territory = resolveGameConferenceTerritory(league, homeTeam, awayTeam);
  return isLiveNcaaConference(territory);
}

export function teamInLiveNcaaConference(
  league: NcaaRouteLeague,
  teamAbbr: string,
): boolean {
  return (
    isLiveNcaaConference(resolveTeamConference(league, teamAbbr)) ||
    isSupplementalLiveNcaaTeam(league, teamAbbr)
  );
}

/** Ingestion gate — discard games outside the live conference allowlist. */
export function shouldIngestNcaaGame(
  league: NcaaRouteLeague,
  homeTeam: string,
  awayTeam: string,
): boolean {
  if (gameTouchesLiveNcaaConference(league, homeTeam, awayTeam)) return true;
  return (
    isSupplementalLiveNcaaTeam(league, homeTeam) ||
    isSupplementalLiveNcaaTeam(league, awayTeam)
  );
}

export function filterNcaaGameLogs<T extends NcaaGameLogRow>(
  league: NcaaRouteLeague,
  games: T[],
): T[] {
  return games.filter((game) =>
    shouldIngestNcaaGame(league, game.homeTeam, game.awayTeam),
  );
}

function filterRefProfile(ref: RefProfile, league: NcaaRouteLeague): RefProfile | null {
  const teamStats = Object.fromEntries(
    Object.entries(ref.teamStats ?? {}).filter(([team]) =>
      teamInLiveNcaaConference(league, team),
    ),
  );
  const recentGames = (ref.recentGames ?? []).filter((game) =>
    shouldIngestNcaaGame(league, game.homeTeam, game.awayTeam),
  );
  const gamesFromTeamStats = Object.values(teamStats).reduce(
    (sum, split) => sum + split.games,
    0,
  );
  if (gamesFromTeamStats === 0 && recentGames.length === 0) return null;

  return {
    ...ref,
    teamStats,
    recentGames,
    games: gamesFromTeamStats > 0 ? gamesFromTeamStats : ref.games,
  };
}

export function filterNcaaRefStats(stats: RefStatsFile, league: NcaaRouteLeague): RefStatsFile {
  const refs = stats.refs
    .map((ref) => filterRefProfile(ref, league))
    .filter((ref): ref is RefProfile => ref !== null);

  const teamSplits = Object.fromEntries(
    Object.entries(stats.teamSplits ?? {}).filter(([team]) =>
      teamInLiveNcaaConference(league, team),
    ),
  );

  return {
    ...stats,
    refs,
    teamSplits,
    meta: {
      ...stats.meta,
      refCount: refs.length,
      // Preserve DISTINCT game count from ingest; summing ref.games multi-counts crew slots.
      totalGamesProcessed: stats.meta.totalGamesProcessed,
    },
  };
}

export function hasNcaaLiveConferenceCoverage(
  league: NcaaRouteLeague,
  stats: RefStatsFile | null | undefined,
  gameLogs?: NcaaGameLogRow[] | null,
): boolean {
  if (stats?.refs?.length) {
    const filtered = filterNcaaRefStats(stats, league);
    if (filtered.refs.some((ref) => ref.games > 0)) {
      return true;
    }
  }

  const dataLeague = league === "cbb" ? "CBB" : "CFB";
  const logs = gameLogs ?? readHydratedNcaaGameLogs(dataLeague);
  const liveGames = filterNcaaGameLogs(league, logs);
  return liveGames.length > 0;
}

export function liveNcaaConferencesForLeague(
  league: NcaaRouteLeague,
  stats: RefStatsFile | null | undefined,
): LiveNcaaConferenceId[] {
  if (!stats?.refs?.length) return [];
  const present = new Set<LiveNcaaConferenceId>();
  for (const ref of stats.refs) {
    for (const game of ref.recentGames ?? []) {
      const territory = resolveGameConferenceTerritory(
        league,
        game.homeTeam ?? "",
        game.awayTeam ?? "",
      );
      if (isLiveNcaaConference(territory)) {
        present.add(territory);
      }
    }
    for (const team of Object.keys(ref.teamStats ?? {})) {
      const conference = resolveTeamConference(league, team);
      if (isLiveNcaaConference(conference)) {
        present.add(conference);
      }
    }
  }
  return LIVE_NCAA_CONFERENCES.filter((id) => present.has(id));
}

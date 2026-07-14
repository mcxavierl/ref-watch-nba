import { getTeam as getCbbTeam } from "@/lib/cbb/teams";
import { getTeam as getCfbTeam } from "@/lib/cfb/teams";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export type NcaaRouteLeague = "cbb" | "cfb";

export type NcaaConferenceTerritory =
  | "ACC"
  | "Big Ten"
  | "Big 12"
  | "SEC"
  | "Big East"
  | "Pac-12"
  | "Other";

/** Audited D-I conferences verified for phased NCAA launch (ACC, SEC, Big Ten). */
export const LIVE_NCAA_CONFERENCES = [
  "ACC",
  "SEC",
  "Big Ten",
] as const satisfies readonly NcaaConferenceTerritory[];

export type LiveNcaaConferenceId = (typeof LIVE_NCAA_CONFERENCES)[number];

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
  return isLiveNcaaConference(resolveTeamConference(league, teamAbbr));
}

/** Ingestion gate — discard games outside the live conference allowlist. */
export function shouldIngestNcaaGame(
  league: NcaaRouteLeague,
  homeTeam: string,
  awayTeam: string,
): boolean {
  return gameTouchesLiveNcaaConference(league, homeTeam, awayTeam);
}

export function filterNcaaGameLogs<T extends Pick<RuntimeGameLogEntry, "homeTeam" | "awayTeam">>(
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

  const verifiedGames = refs.reduce((sum, ref) => sum + ref.games, 0);

  return {
    ...stats,
    refs,
    teamSplits,
    meta: {
      ...stats.meta,
      refCount: refs.length,
      totalGamesProcessed: verifiedGames,
    },
  };
}

export function hasNcaaLiveConferenceCoverage(
  league: NcaaRouteLeague,
  stats: RefStatsFile | null | undefined,
): boolean {
  if (!stats?.refs?.length) return false;
  const filtered = filterNcaaRefStats(stats, league);
  return filtered.refs.some((ref) => ref.games > 0);
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

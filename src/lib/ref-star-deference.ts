import { computeStarDeferenceIndex } from "@/lib/analytics/star-deference-index";
import {
  getCachedGameLogs,
  type DataLeague,
  type RuntimeGameLogEntry,
} from "@/lib/game-logs-preload";
import { loadRuntimeGameLogs } from "@/lib/game-logs";
import type { LeagueId } from "@/lib/leagues";
import { PRO_MATRIX_ANALYTICS_LEAGUE_IDS } from "@/lib/league-verification";
import { loadPersonnelProfiles } from "@/lib/personnel-profiles";
import type { RefProfile, StarTreatmentAnalytics } from "@/lib/types";
import { getWorkerIsolateStore } from "@/lib/worker-isolate-store";

const LEAGUE_TO_DATA: Partial<Record<LeagueId, DataLeague>> = {
  nba: "NBA",
  nfl: "NFL",
  nhl: "NHL",
  wnba: "WNBA",
  cbb: "CBB",
};

function starDeferenceCacheKey(leagueId: LeagueId, slug: string): string {
  return `star-deference:v1:${leagueId}:${slug}`;
}

function toInput(game: RuntimeGameLogEntry) {
  return {
    gameId: game.gameId,
    date: game.date,
    season: game.season,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    totalFouls: game.totalFouls,
    homeFouls: game.homeFouls,
    awayFouls: game.awayFouls,
    homeFlags: game.homeFlags,
    awayFlags: game.awayFlags,
    homeMinors: game.homeMinors,
    awayMinors: game.awayMinors,
    officials: game.officials,
    personnel: game.personnel,
  };
}

/**
 * Request-scoped star deference analytics for one official.
 * Falls back to persisted profile fields when game logs are unavailable.
 */
export function computeRefStarDeference(
  leagueId: LeagueId,
  profile: RefProfile,
): StarTreatmentAnalytics | null {
  if (profile.starTreatmentAnalytics?.star_deference_index !== null &&
      profile.starTreatmentAnalytics?.star_deference_index !== undefined) {
    return profile.starTreatmentAnalytics;
  }

  const cache = getWorkerIsolateStore().matrixCompute;
  const cacheKey = starDeferenceCacheKey(leagueId, profile.slug);
  const cached = cache.get(cacheKey);
  if (cached) return cached as StarTreatmentAnalytics;

  const dataLeague = LEAGUE_TO_DATA[leagueId];
  if (!dataLeague) return profile.starTreatmentAnalytics ?? null;

  const personnel = loadPersonnelProfiles(leagueId);
  if (!personnel?.starPlayers.length) return profile.starTreatmentAnalytics ?? null;

  const games =
    getCachedGameLogs(dataLeague)?.games ??
    loadRuntimeGameLogs(dataLeague)?.games ??
    null;
  if (!games?.length) return profile.starTreatmentAnalytics ?? null;

  const result = computeStarDeferenceIndex(
    leagueId,
    profile.slug,
    games.map(toInput),
    personnel.starPlayers,
  );

  if (result.data_quality === "insufficient") {
    cache.set(cacheKey, null);
    return profile.starTreatmentAnalytics ?? null;
  }

  const analytics: StarTreatmentAnalytics = {
    star_deference_index: result.star_deference_index,
    star_deference_display: result.star_deference_display,
    star_drawn_rate_delta: result.star_drawn_rate_delta,
    rotation_foul_rate_delta: result.rotation_foul_rate_delta,
    star_player_observations: result.star_player_observations,
    star_sample_games: result.star_sample_games,
    star_unique_players: result.star_unique_players,
    method_note: result.method_note,
  };

  cache.set(cacheKey, analytics);
  return analytics;
}

export function supportsStarDeferenceLeague(leagueId: LeagueId): boolean {
  return (
  (PRO_MATRIX_ANALYTICS_LEAGUE_IDS as readonly LeagueId[]).includes(leagueId) ||
    leagueId === "wnba" ||
    leagueId === "cbb"
  );
}

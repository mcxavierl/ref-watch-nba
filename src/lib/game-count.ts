import type { TeamCrewSplit } from "@/lib/types";

/** Hover copy for verified game totals shown in the UI. */
export const VERIFIED_GAMES_TOOLTIP =
  "Verified regular season & playoff games";

export interface GameLogRow {
  gameId: string;
  season?: string;
  homeTeam: string;
  awayTeam: string;
}

/** COUNT(DISTINCT game_id) for a list of game-log rows. */
export function countDistinctGames(
  games: readonly { gameId?: string | null }[],
): number {
  const ids = new Set<string>();
  for (const game of games) {
    const id = game.gameId;
    if (id) ids.add(String(id));
  }
  return ids.size;
}

/** Distinct games a team played within an optional season window. */
export function countTeamGamesFromLogs(
  games: readonly GameLogRow[],
  teamAbbr: string,
  seasons?: readonly string[],
): number {
  const team = teamAbbr.toUpperCase();
  const seasonSet = seasons ? new Set(seasons) : null;
  const ids = new Set<string>();
  for (const game of games) {
    if (seasonSet && game.season && !seasonSet.has(game.season)) continue;
    if (game.homeTeam !== team && game.awayTeam !== team) continue;
    if (game.gameId) ids.add(String(game.gameId));
  }
  return ids.size;
}

/** Per-team DISTINCT game_id counts from game logs (optionally season-scoped). */
export function buildTeamGameCountMap(
  games: readonly GameLogRow[],
  seasons?: readonly string[],
): Map<string, number> {
  const seasonSet = seasons ? new Set(seasons) : null;
  const byTeam = new Map<string, Set<string>>();
  for (const game of games) {
    if (seasonSet && game.season && !seasonSet.has(game.season)) continue;
    const id = game.gameId ? String(game.gameId) : "";
    if (!id) continue;
    for (const abbr of [game.homeTeam, game.awayTeam]) {
      const key = abbr.toUpperCase();
      const set = byTeam.get(key) ?? new Set<string>();
      set.add(id);
      byTeam.set(key, set);
    }
  }
  const counts = new Map<string, number>();
  for (const [team, ids] of byTeam) counts.set(team, ids.size);
  return counts;
}

/**
 * Team game total from crew splits: sum W-L (each game sits in one crew bucket).
 * Prefer countTeamGamesFromLogs when game logs are available.
 */
export function gameCountFromCrewSplits(splits: readonly TeamCrewSplit[]): number {
  const wins = splits.reduce((sum, split) => sum + split.wins, 0);
  const losses = splits.reduce((sum, split) => sum + split.losses, 0);
  return wins + losses;
}

/** Deviation between two counts; returns 0 when expected is 0. */
export function gameCountDeviationPct(
  actual: number,
  expected: number,
): number {
  if (expected <= 0) return actual === 0 ? 0 : 100;
  return Math.abs((actual - expected) / expected) * 100;
}

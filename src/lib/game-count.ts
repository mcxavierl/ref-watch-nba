import { refSlug } from "@/lib/ref-slug";
import type { TeamCrewSplit } from "@/lib/types";

/** Hover copy for verified game totals shown in the UI. */
export const VERIFIED_GAMES_TOOLTIP =
  "Verified regular season & playoff games";

export interface GameLogRow {
  gameId: string;
  season?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
}

export interface RefGameLogRow extends GameLogRow {
  officials: readonly { name: string; number: number }[];
}

/** Keep the first row for each DISTINCT game_id (stable order). */
export function dedupeByGameId<T extends { gameId?: string | null }>(
  rows: readonly T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const id = row.gameId ? String(row.gameId) : "";
    if (!id) {
      out.push(row);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out.length > 0 ? out : [...rows];
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

/** COUNT(DISTINCT game_id) for games where the ref officiated (slug match). */
export function countRefGamesFromLogs(
  games: readonly RefGameLogRow[],
  slug: string,
  seasons?: readonly string[],
): number {
  return countRefGamesFromLogsMatching(
    games,
    (official) => refSlug(official.name, official.number) === slug,
    seasons,
  );
}

/** COUNT(DISTINCT game_id) with a custom official matcher (e.g. canonical name). */
export function countRefGamesFromLogsMatching(
  games: readonly RefGameLogRow[],
  matchesOfficial: (official: { name: string; number: number }) => boolean,
  seasons?: readonly string[],
): number {
  const seasonSet = seasons ? new Set(seasons) : null;
  const ids = new Set<string>();
  for (const game of games) {
    if (seasonSet && game.season && !seasonSet.has(game.season)) continue;
    for (const official of game.officials) {
      if (matchesOfficial(official)) {
        if (game.gameId) ids.add(String(game.gameId));
        break;
      }
    }
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

/** DISTINCT games plus W-L from scored game logs (preferred over crew-split sums). */
export function getTeamRecordFromLogs(
  games: readonly GameLogRow[],
  teamAbbr: string,
  seasons?: readonly string[],
): { wins: number; losses: number; games: number; winRate: number } {
  const team = teamAbbr.toUpperCase();
  const seasonSet = seasons ? new Set(seasons) : null;
  const seen = new Set<string>();
  let wins = 0;
  let losses = 0;

  for (const game of games) {
    if (seasonSet && game.season && !seasonSet.has(game.season)) continue;
    if (game.homeTeam !== team && game.awayTeam !== team) continue;
    const id = game.gameId ? String(game.gameId) : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const homeScore = game.homeScore;
    const awayScore = game.awayScore;
    if (homeScore === undefined || awayScore === undefined) continue;

    const isHome = game.homeTeam === team;
    const teamScore = isHome ? homeScore : awayScore;
    const oppScore = isHome ? awayScore : homeScore;
    if (teamScore > oppScore) wins++;
    else if (teamScore < oppScore) losses++;
  }

  const gamesPlayed = wins + losses;
  return {
    wins,
    losses,
    games: gamesPlayed,
    winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
  };
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

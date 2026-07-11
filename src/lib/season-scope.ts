import {
  CURRENT_SEASON_LABEL,
  dataLeagueTenSeasons,
  DEFAULT_SINCE_SEASON,
} from "@/lib/league-seasons";
import type { LeagueId } from "@/lib/leagues";

export type SeasonScopeMode = "current" | "last5" | "last10";

export const SEASON_SCOPE_MODES: SeasonScopeMode[] = [
  "current",
  "last5",
  "last10",
];

export const DEFAULT_SEASON_SCOPE_MODE: SeasonScopeMode = "last10";

export function parseSeasonScopeMode(
  raw: string | null | undefined,
): SeasonScopeMode {
  if (raw === "current" || raw === "last5" || raw === "last10") return raw;
  return DEFAULT_SEASON_SCOPE_MODE;
}

export function resolveScopedSeasons(
  allSeasons: string[],
  mode: SeasonScopeMode,
): string[] {
  const sorted = [...allSeasons].sort();
  if (sorted.length === 0) return [];

  switch (mode) {
    case "current":
      return [sorted[sorted.length - 1]!];
    case "last5":
      return sorted.slice(-5);
    case "last10":
      return sorted.slice(-10);
    default:
      return sorted;
  }
}

export function resolveScopedSeasonsForLeague(
  leagueId: LeagueId,
  mode: SeasonScopeMode,
  availableSeasons?: string[],
): string[] {
  const dataLeagueMap: Record<
    LeagueId,
    "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB"
  > = {
    nba: "NBA",
    nhl: "NHL",
    nfl: "NFL",
    epl: "EPL",
    laliga: "LALIGA",
    cbb: "CBB",
    cfb: "CFB",
    wnba: "NBA",
    mlb: "NBA",
  };
  const fallback = dataLeagueTenSeasons(dataLeagueMap[leagueId]);
  const pool =
    availableSeasons !== undefined
      ? [...availableSeasons].sort()
      : [...fallback];
  return resolveScopedSeasons(pool, mode);
}

export function seasonScopeLabel(mode: SeasonScopeMode): string {
  switch (mode) {
    case "current":
      return "This season";
    case "last5":
      return "Last 5 seasons";
    case "last10":
      return "Last 10 seasons";
  }
}

/** Honest toggle label from actual available seasons (e.g. last10 with 5 seasons → "Last 5 seasons"). */
export function seasonScopeLabelForSeasons(
  mode: SeasonScopeMode,
  availableSeasons: string[],
): string {
  return formatSeasonScope(resolveScopedSeasons(availableSeasons, mode).length);
}

export function formatSeasonScopeFromMode(mode: SeasonScopeMode): string {
  switch (mode) {
    case "current":
      return "This season";
    case "last5":
      return "Last 5 seasons";
    case "last10":
      return "Last 10 seasons";
  }
}

export function formatSeasonScope(seasonCount: number): string {
  if (seasonCount <= 0) return "-";
  if (seasonCount === 1) return "This season";
  return `Last ${seasonCount} seasons`;
}

export function scopedSinceSeason(scopedSeasons: string[]): string {
  if (scopedSeasons.length === 0) return DEFAULT_SINCE_SEASON;
  return [...scopedSeasons].sort()[0] ?? DEFAULT_SINCE_SEASON;
}

export function isCurrentSeasonScope(mode: SeasonScopeMode): boolean {
  return mode === "current";
}

export function readSeasonScopeParam(
  scope: string | null | undefined,
): SeasonScopeMode {
  return parseSeasonScopeMode(scope);
}

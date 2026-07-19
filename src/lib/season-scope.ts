import {
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

export type SeasonScopeContext = {
  teamAbbr?: string;
};

/** True only when a route must parse game logs and rebuild scoped stats (Worker-heavy). */
export function needsGameLogRebuild(
  leagueId: LeagueId,
  _scopeMode: SeasonScopeMode,
  _context?: SeasonScopeContext,
): boolean {
  return leagueId === "nba" || leagueId === "wnba";
}

export function parseSeasonScopeMode(
  raw: string | null | undefined,
  _leagueId?: LeagueId,
  _context?: SeasonScopeContext,
): SeasonScopeMode {
  if (raw === "current" || raw === "last5" || raw === "last10") {
    return raw;
  }
  return DEFAULT_SEASON_SCOPE_MODE;
}

function seasonStartYear(label: string): number | null {
  const start = Number.parseInt(label.split("-")[0] ?? "", 10);
  return Number.isFinite(start) ? start : null;
}

/** Calendar year when a season ends (e.g. 2025-26 → 2026). */
export function seasonEndDisplayYear(season: string): number {
  const start = seasonStartYear(season);
  if (start === null) return new Date().getFullYear();
  const endPart = season.split("-")[1];
  if (!endPart) return start + 1;
  if (endPart.length === 2) {
    const century = Math.floor(start / 100) * 100;
    return century + Number.parseInt(endPart, 10);
  }
  const parsed = Number.parseInt(endPart, 10);
  return Number.isFinite(parsed) ? parsed : start + 1;
}

/** Compact year span for scoped seasons, e.g. 2016-2026. */
export function formatScopedSeasonYearSpan(scopedSeasons: string[]): string {
  const sorted = [...scopedSeasons].sort();
  if (sorted.length === 0) return "-";
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const startYear = seasonStartYear(first);
  const endYear = seasonEndDisplayYear(last);
  if (startYear === null) return "-";
  if (sorted.length === 1) {
    return `${startYear}-${String(endYear).slice(-2)}`;
  }
  return `${startYear}-${endYear}`;
}

/** Approximate calendar bounds for a scoped season list (Sep start year through Feb end year). */
export function scopedSeasonDateRange(
  scopedSeasons: string[],
): { earliest: string; latest: string } | null {
  const sorted = [...scopedSeasons].sort();
  if (sorted.length === 0) return null;
  const startYear = seasonStartYear(sorted[0]!);
  if (startYear === null) return null;
  const endYear = seasonEndDisplayYear(sorted[sorted.length - 1]!);
  return {
    earliest: `${startYear}-09-01`,
    latest: `${endYear}-02-28`,
  };
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
    "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB" | "WNBA"
  > = {
    nba: "NBA",
    nhl: "NHL",
    nfl: "NFL",
    epl: "EPL",
    laliga: "LALIGA",
    cbb: "CBB",
    cfb: "CFB",
    wnba: "WNBA",
    mlb: "NBA",
  };
  const fallback = dataLeagueTenSeasons(dataLeagueMap[leagueId]);
  const pool =
    availableSeasons !== undefined
      ? [...availableSeasons].sort()
      : [...fallback];
  return resolveScopedSeasons(pool, mode);
}

export function seasonScopeModesForLeague(
  _leagueId: LeagueId,
  _context?: SeasonScopeContext,
): SeasonScopeMode[] {
  return SEASON_SCOPE_MODES;
}

export function defaultSeasonScopeForLeague(
  _leagueId: LeagueId,
  _context?: SeasonScopeContext,
): SeasonScopeMode {
  return DEFAULT_SEASON_SCOPE_MODE;
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
  return seasonScopeLabel(mode);
}

export function formatSeasonScope(seasonCount: number): string {
  if (seasonCount <= 0) return "-";
  if (seasonCount === 1) return "This season";
  return `Last ${seasonCount} seasons`;
}

/** Default-scope season span for hub hero cards (not raw meta.seasons length). */
export function hubDisplaySeasonScope(
  leagueId: LeagueId,
  availableSeasons: string[],
): { seasonSpan: string; seasonCount: number } {
  const mode = defaultSeasonScopeForLeague(leagueId);
  const scoped = resolveScopedSeasonsForLeague(leagueId, mode, availableSeasons);
  return {
    seasonCount: scoped.length,
    seasonSpan: formatScopedSeasonYearSpan(scoped),
  };
}

/** Lowercase season span for matrix page-lead parentheticals, e.g. "last 10 seasons". */
export function matrixLeadSeasonPhrase(seasonCount: number): string {
  return formatSeasonScope(seasonCount).toLowerCase();
}

/** Hub hero copy from scoped seasons, e.g. "dating back to 2016". */
export function formatDatingBackPhrase(seasons: string[]): string {
  if (seasons.length === 0) return "with limited history";
  const since = scopedSinceSeason(seasons);
  const year = since.slice(0, 4);
  if (seasons.length === 1) return `for the ${since} season`;
  return `dating back to ${year}`;
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
  leagueId?: LeagueId,
  context?: SeasonScopeContext,
): SeasonScopeMode {
  return parseSeasonScopeMode(scope, leagueId, context);
}

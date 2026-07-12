import {
  CURRENT_SEASON_LABEL,
  dataLeagueTenSeasons,
  DEFAULT_SINCE_SEASON,
} from "@/lib/league-seasons";
import type { LeagueId } from "@/lib/leagues";

export type SeasonScopeMode =
  | "current"
  | "last5"
  | "last10"
  | "era2000s"
  | "era2010s"
  | "era2020s";

export const SEASON_SCOPE_MODES: SeasonScopeMode[] = [
  "current",
  "last5",
  "last10",
];

/** NFL decade buckets requested for historical ref×team analysis. */
export const NFL_SEASON_SCOPE_MODES: SeasonScopeMode[] = [
  "era2020s",
  "era2010s",
  "era2000s",
];

export const DEFAULT_SEASON_SCOPE_MODE: SeasonScopeMode = "last10";

export const DEFAULT_NFL_SEASON_SCOPE_MODE: SeasonScopeMode = "era2020s";

/** Patriots-only decade buckets for historical ref×team analysis. */
export const PATRIOTS_ERA_TEAM_ABBR = "NE";

export type SeasonScopeContext = {
  teamAbbr?: string;
};

export function usesPatriotsEraScope(
  leagueId?: LeagueId,
  context?: SeasonScopeContext,
): boolean {
  return (
    leagueId === "nfl" &&
    context?.teamAbbr?.toUpperCase() === PATRIOTS_ERA_TEAM_ABBR
  );
}

export function isEraScopeMode(mode: SeasonScopeMode): boolean {
  return mode === "era2000s" || mode === "era2010s" || mode === "era2020s";
}

/** True only when a route must parse game logs and rebuild scoped stats (Worker-heavy). */
export function needsGameLogRebuild(
  leagueId: LeagueId,
  scopeMode: SeasonScopeMode,
  context?: SeasonScopeContext,
): boolean {
  if (leagueId === "nfl") {
    return (
      isEraScopeMode(scopeMode) && usesPatriotsEraScope(leagueId, context)
    );
  }
  if (leagueId === "nba") return true;
  return false;
}

export function parseSeasonScopeMode(
  raw: string | null | undefined,
  leagueId?: LeagueId,
  context?: SeasonScopeContext,
): SeasonScopeMode {
  if (raw === "current" || raw === "last5" || raw === "last10") {
    return raw;
  }
  if (
    raw === "era2000s" ||
    raw === "era2010s" ||
    raw === "era2020s"
  ) {
    if (usesPatriotsEraScope(leagueId, context)) return raw;
    return DEFAULT_SEASON_SCOPE_MODE;
  }
  if (usesPatriotsEraScope(leagueId, context)) {
    return DEFAULT_NFL_SEASON_SCOPE_MODE;
  }
  return DEFAULT_SEASON_SCOPE_MODE;
}

function seasonStartYear(label: string): number | null {
  const start = Number.parseInt(label.split("-")[0] ?? "", 10);
  return Number.isFinite(start) ? start : null;
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
    case "era2000s":
      return sorted.filter((season) => {
        const start = seasonStartYear(season);
        return start !== null && start >= 2000 && start <= 2009;
      });
    case "era2010s":
      return sorted.filter((season) => {
        const start = seasonStartYear(season);
        return start !== null && start >= 2010 && start <= 2019;
      });
    case "era2020s":
      return sorted.filter((season) => {
        const start = seasonStartYear(season);
        return start !== null && start >= 2020;
      });
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

export function seasonScopeModesForLeague(
  leagueId: LeagueId,
  context?: SeasonScopeContext,
): SeasonScopeMode[] {
  if (usesPatriotsEraScope(leagueId, context)) return NFL_SEASON_SCOPE_MODES;
  return SEASON_SCOPE_MODES;
}

export function defaultSeasonScopeForLeague(
  leagueId: LeagueId,
  context?: SeasonScopeContext,
): SeasonScopeMode {
  if (usesPatriotsEraScope(leagueId, context)) {
    return DEFAULT_NFL_SEASON_SCOPE_MODE;
  }
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
    case "era2000s":
      return "2000–2010";
    case "era2010s":
      return "2010–2020";
    case "era2020s":
      return "2020–now";
  }
}

/** Honest toggle label from actual available seasons (e.g. last10 with 5 seasons → "Last 5 seasons"). */
export function seasonScopeLabelForSeasons(
  mode: SeasonScopeMode,
  availableSeasons: string[],
): string {
  if (mode === "era2000s" || mode === "era2010s" || mode === "era2020s") {
    const count = resolveScopedSeasons(availableSeasons, mode).length;
    if (count === 0) return seasonScopeLabel(mode);
    return `${seasonScopeLabel(mode)} (${count} seasons)`;
  }
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

/** Lowercase season span for matrix page-lead parentheticals, e.g. "last 10 seasons". */
export function matrixLeadSeasonPhrase(seasonCount: number): string {
  return formatSeasonScope(seasonCount).toLowerCase();
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

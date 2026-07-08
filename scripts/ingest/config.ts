import * as path from "node:path";

export const INGEST_SEASONS = [
  "2021-22",
  "2022-23",
  "2023-24",
  "2024-25",
  "2025-26",
] as const;

export type IngestSeason = (typeof INGEST_SEASONS)[number];

export const NBA_STATS_RATE_MS = 334; // 3 requests / second
export const BBR_REQUEST_DELAY_MS = 1500;

export const DATA_ROOT = path.join(process.cwd(), "data", "nba");
export const GAME_LOGS_DIR = path.join(DATA_ROOT, "game-logs");
export const BBR_CACHE_DIR = path.join(DATA_ROOT, "cache", "bbr");
export const MANIFEST_PATH = path.join(DATA_ROOT, "manifest.json");
export const DISCREPANCIES_PATH = path.join(DATA_ROOT, "discrepancies.ndjson");
export const INGEST_LOG_PATH = path.join(DATA_ROOT, "ingest-log.ndjson");

export const BBR_BASE = "https://www.basketball-reference.com";
export const NBA_STATS_BASE = "https://stats.nba.com/stats";

/** BBR URL year (2024-25 season → 2025). */
export function seasonToBbrYear(season: string): number {
  const [start] = season.split("-");
  return Number.parseInt(start, 10) + 1;
}

export function bbrScheduleUrl(season: string): string {
  return `${BBR_BASE}/leagues/NBA_${seasonToBbrYear(season)}_games.html`;
}

export const BBR_SCHEDULE_MONTHS = [
  "october",
  "november",
  "december",
  "january",
  "february",
  "march",
  "april",
] as const;

export function bbrScheduleMonthUrl(
  season: string,
  month: (typeof BBR_SCHEDULE_MONTHS)[number],
): string {
  return `${BBR_BASE}/leagues/NBA_${seasonToBbrYear(season)}_games-${month}.html`;
}

export function bbrStandingsUrl(season: string): string {
  return `${BBR_BASE}/leagues/NBA_${seasonToBbrYear(season)}_standings.html`;
}

export function bbrPlayoffsUrl(season: string): string {
  return `${BBR_BASE}/playoffs/NBA_${seasonToBbrYear(season)}.html`;
}

export const BBR_REF_INDEX_URL = `${BBR_BASE}/referees/`;

export const BBR_TEAM_SLUG: Record<string, string> = {
  BKN: "BRK",
  CHA: "CHO",
  PHX: "PHO",
};

export const NBA_TEAM_ABBRS = [
  "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
] as const;

/** Full regular-season game counts (82-game schedule per team). */
export const EXPECTED_REGULAR_SEASON_GAMES: Record<IngestSeason, number> = {
  "2021-22": 1230,
  "2022-23": 1230,
  "2023-24": 1230,
  "2024-25": 1230,
  "2025-26": 1230,
};

/** Known postponements/reschedules excluded from 2025-26 count (audited Jul 2026). */
export const SEASON_2025_26_POSTPONEMENTS = 0;

export function expectedGameCount(season: IngestSeason, asOfDate = "2026-07-08"): number {
  const full = EXPECTED_REGULAR_SEASON_GAMES[season];
  if (season !== "2025-26") return full;
  // Season complete as of Jul 2026.
  return full - SEASON_2025_26_POSTPONEMENTS;
}

export const SAMPLE_REFS_FOR_TOTAL_CHECK = [
  "Scott Foster",
  "Tony Brothers",
  "Marc Davis",
  "Ed Malloy",
  "Josh Tiven",
  "Bill Kennedy",
  "John Goble",
  "David Guthrie",
  "Courtney Kirkland",
  "Zach Zarba",
] as const;

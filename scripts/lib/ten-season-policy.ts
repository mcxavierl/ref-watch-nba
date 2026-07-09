/**
 * Shared 10-season ingest window for production leagues.
 * Labels use NBA-style format (2016-17 … 2025-26).
 */
export {
  NBA_TEN_SEASONS,
  NHL_TEN_SEASONS,
  NFL_TEN_SEASONS,
  EPL_TEN_SEASONS,
  CURRENT_SEASON_LABEL,
} from "../../src/lib/league-seasons";

export const TEN_SEASON_POLICY_NOTE =
  "Verified production leagues target 10 full seasons (2016-17 through 2025-26) where source APIs allow.";

/** NHL api-web season id: 2024-25 → 20242025 */
export function nhlSeasonApiId(season: string): string {
  const startYear = Number.parseInt(season.slice(0, 4), 10);
  return `${startYear}${startYear + 1}`;
}

/** ESPN soccer/NFL season year (start calendar year). 2024-25 → 2024 */
export function espnSeasonStartYear(season: string): number {
  return Number.parseInt(season.slice(0, 4), 10);
}

export function espnSeasonYearsFromLabels(seasons: readonly string[]): number[] {
  return seasons.map(espnSeasonStartYear);
}

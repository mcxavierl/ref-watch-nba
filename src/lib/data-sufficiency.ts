import type { InsightsLeagueId } from "@/lib/league-manifest";
import {
  GSNI_MIN_HIGH_LEVERAGE_MINUTES,
  GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL,
} from "@/lib/gsni";

/** Metric-specific minimum sample thresholds for official tables. */
export const DATA_SUFFICIENCY_THRESHOLDS = {
  /** Default game-count gate from league ref-stats meta (typically 30). */
  officialGames: "meta-min-sample" as const,
  /** GSNI high-leverage minutes gate (NBA). */
  gsniHighLeverageMinutesNba: GSNI_MIN_HIGH_LEVERAGE_MINUTES,
  /** GSNI high-leverage minutes gate (NFL). */
  gsniHighLeverageMinutesNfl: GSNI_MIN_HIGH_LEVERAGE_MINUTES_NFL,
} as const;

export type DataSufficiencyMetric =
  | "official-games"
  | "gsni-high-leverage-minutes";

export function gsniHighLeverageThresholdForLeague(
  leagueId: InsightsLeagueId,
): number {
  return leagueId === "nfl"
    ? DATA_SUFFICIENCY_THRESHOLDS.gsniHighLeverageMinutesNfl
    : DATA_SUFFICIENCY_THRESHOLDS.gsniHighLeverageMinutesNba;
}

export function meetsDataSufficiency(
  sampleSize: number,
  threshold: number,
): boolean {
  return Number.isFinite(sampleSize) && sampleSize >= threshold;
}

export function partitionByDataSufficiency<T>(
  items: readonly T[],
  meetsThreshold: (item: T) => boolean,
): { sufficient: T[]; insufficient: T[] } {
  const sufficient: T[] = [];
  const insufficient: T[] = [];
  for (const item of items) {
    if (meetsThreshold(item)) sufficient.push(item);
    else insufficient.push(item);
  }
  return { sufficient, insufficient };
}

export function mergeSufficiencyLists<T>(
  sufficient: readonly T[],
  insufficient: readonly T[],
  showAll: boolean,
): T[] {
  if (!showAll) return [...sufficient];
  return [...sufficient, ...insufficient];
}

export const DATA_SUFFICIENCY_EXPANDED_NOTE =
  "Referees below the threshold do not meet the minimum game requirement for high-confidence insights.";

export const DATA_SUFFICIENCY_GSNI_EXPANDED_NOTE =
  "Officials below the threshold do not meet the minimum high-leverage minutes requirement for high-confidence index scores.";

export function formatOfficialGamesThreshold(threshold: number): string {
  return `${threshold}-game minimum`;
}

export function formatGsniMinutesThreshold(
  threshold: number,
  leagueId: InsightsLeagueId,
): string {
  const sport = leagueId === "nfl" ? "penalty" : "foul";
  return `${threshold} high-leverage ${sport} minutes minimum`;
}

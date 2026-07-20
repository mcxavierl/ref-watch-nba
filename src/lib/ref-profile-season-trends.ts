import { PRESSURE_GAUGE_LABELS, pressureGaugeState } from "@/lib/analytics/leverage-sensitivity";
import { consistencyClassificationDisplayLabel } from "@/lib/analytics/consistency-variance";
import { STATE_CHIP_CLASS, type StateChipClass } from "@/constants/colors";
import type {
  RefereeArchetypeId,
  SeasonOfficialStatsEntry,
} from "@/lib/types";

const ARCHETYPE_DISPLAY_NAMES: Record<RefereeArchetypeId, string> = {
  "procedural-stickler": "Procedural Stickler",
  "game-flow-manager": "Game-Flow Manager",
  balanced: "Balanced",
};

export const RECENT_SEASON_TREND_COUNT = 3;
export const INSUFFICIENT_SEASON_SAMPLE_GAMES = 10;

export type SeasonTrendView = "all" | "recent";

export type SeasonTrendRow =
  | {
      kind: "ok";
      season: string;
      archetype: RefereeArchetypeId;
      archetypeLabel: string;
      foulRatio: number;
      leverageSensitivity: string;
      consistency: number;
      consistencyIndex: number | null;
      consistencyClassification: string;
      sampleGames: number;
    }
  | {
      kind: "insufficient";
      season: string;
      sampleGames: number;
    };

function compareSeasonLabelsDesc(a: string, b: string): number {
  const yearA = Number.parseInt(a.split("-")[0] ?? "0", 10);
  const yearB = Number.parseInt(b.split("-")[0] ?? "0", 10);
  return yearB - yearA;
}

export function archetypeChipClass(archetype: RefereeArchetypeId): StateChipClass {
  if (archetype === "procedural-stickler") return STATE_CHIP_CLASS.risk;
  if (archetype === "game-flow-manager") return STATE_CHIP_CLASS.stable;
  return STATE_CHIP_CLASS.neutral;
}

export function formatLeverageSensitivity(
  entry: Extract<SeasonOfficialStatsEntry, { status: "ok" }>,
): string {
  if (entry.leverage_index !== null) {
    const pct = entry.leverage_index * 100;
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(0)}%`;
  }

  if (entry.leverage_profile === "high-leverage-sensitivity") {
    return PRESSURE_GAUGE_LABELS[pressureGaugeState(entry.leverage_profile)];
  }
  if (entry.leverage_profile === "swallows-whistle") {
    return PRESSURE_GAUGE_LABELS[pressureGaugeState(entry.leverage_profile)];
  }
  return "Neutral";
}

function toSeasonTrendRow(season: string, entry: SeasonOfficialStatsEntry): SeasonTrendRow {
  if (entry.status === "INSUFFICIENT_DATA") {
    return {
      kind: "insufficient",
      season,
      sampleGames: entry.sample_games,
    };
  }

  return {
    kind: "ok",
    season,
    archetype: entry.primary_archetype,
    archetypeLabel: ARCHETYPE_DISPLAY_NAMES[entry.primary_archetype],
    foulRatio: entry.admin_ratio,
    leverageSensitivity: formatLeverageSensitivity(entry),
    consistency: entry.consistency_score,
    consistencyIndex: entry.consistency_index ?? null,
    consistencyClassification:
      entry.consistency_classification_label !== undefined
        ? consistencyClassificationDisplayLabel(
            entry.consistency_classification_label as import("@/lib/analytics/consistency-variance").ConsistencyClassificationLabel,
          )
        : "Insufficient whistle sample",
    sampleGames: entry.sample_games,
  };
}

export function buildSeasonTrendRows(
  officialStatsBySeason: Record<string, SeasonOfficialStatsEntry> | undefined,
  view: SeasonTrendView,
): SeasonTrendRow[] {
  if (!officialStatsBySeason) return [];

  const seasons = Object.keys(officialStatsBySeason).sort(compareSeasonLabelsDesc);
  const scopedSeasons =
    view === "recent" ? seasons.slice(0, RECENT_SEASON_TREND_COUNT) : seasons;

  return scopedSeasons.map((season) =>
    toSeasonTrendRow(season, officialStatsBySeason[season]!),
  );
}

export function hasSeasonTrendData(
  officialStatsBySeason: Record<string, SeasonOfficialStatsEntry> | undefined,
): boolean {
  return Boolean(officialStatsBySeason && Object.keys(officialStatsBySeason).length > 0);
}

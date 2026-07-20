import {
  archetypeThresholdsForLeague,
} from "@/lib/analytics/archetype-thresholds";
import {
  dataQualityFromSampleSize,
  meetsSampleSizeThreshold,
  SAMPLE_SIZE_THRESHOLD,
  type DataQualityState,
} from "@/lib/analytics/sample-size";
import {
  isWhistleTaxonomyLeague,
  splitAggregateWhistleCount,
  type WhistleTaxonomyLeague,
} from "@/config/penalty-types";
import { populationStdDev } from "@/lib/metric-significance";
import type { LeagueId } from "@/lib/leagues";
import type { OfficialStats, RefereeArchetypeId } from "@/lib/types";
import { computeGameDispositionCounts } from "@/lib/whistle-disposition";

export const ARCHETYPE_SAMPLE_WINDOW = 50;
/** @deprecated Use SAMPLE_SIZE_THRESHOLD for professional gatekeeping. */
export const ARCHETYPE_MIN_SAMPLE_GAMES = SAMPLE_SIZE_THRESHOLD;
export const ADMIN_RATIO_PROCEDURAL_THRESHOLD = 1.5;
export const ADMIN_RATIO_GAME_MANAGER_THRESHOLD = 0.7;
export const CLOSE_GAME_SCORE_DIFF_THRESHOLD = 5;
export const CLOSE_GAME_PRESSURE_DELTA_THRESHOLD = 0.2;
export const CONSISTENCY_CV_VOLATILE_THRESHOLD = 0.35;
export const CONSISTENCY_CV_STABLE_THRESHOLD = 0.18;

export type ArchetypeGameInput = {
  homeScore: number;
  awayScore: number;
  totalFouls: number;
  homeFlags?: number;
  awayFlags?: number;
  homeMinors?: number;
  awayMinors?: number;
  subjectiveFlags?: number;
  administrativeFlags?: number;
  penaltyEvents?: import("@/lib/types").NflPenaltyEvent[];
};

export type RefereeArchetypeResult = OfficialStats & {
  blurb: string;
  displayName: string;
  coefficientOfVariation: number;
  primaryFoulType: string;
  volatilityLabel: "High" | "Low";
  handicappingSignal: "Risk" | "Stability";
  data_quality: DataQualityState;
};

export const ARCHETYPE_DISPLAY_NAMES: Record<RefereeArchetypeId, string> = {
  "procedural-stickler": "Procedural Stickler",
  "game-flow-manager": "Game-Flow Manager",
  balanced: "Balanced",
};

export const ARCHETYPE_PRIMARY_FOUL_TYPE: Record<RefereeArchetypeId, string> = {
  "procedural-stickler": "procedural infractions",
  "game-flow-manager": "subjective game-flow fouls",
  balanced: "a balanced procedural and subjective mix",
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function normalizeArchetypeId(value: string): RefereeArchetypeId {
  if (value === "game-manager") return "game-flow-manager";
  if (
    value === "procedural-stickler" ||
    value === "game-flow-manager" ||
    value === "balanced"
  ) {
    return value;
  }
  return "balanced";
}

function whistleTotal(leagueId: LeagueId, game: ArchetypeGameInput): number {
  if (leagueId === "nfl") {
    return (game.homeFlags ?? 0) + (game.awayFlags ?? 0);
  }
  if (leagueId === "nhl") {
    return (game.homeMinors ?? 0) + (game.awayMinors ?? 0);
  }
  return game.totalFouls;
}

function dispositionCounts(
  leagueId: LeagueId,
  game: ArchetypeGameInput,
): { subjective: number; administrative: number } {
  if (isWhistleTaxonomyLeague(leagueId)) {
    return computeGameDispositionCounts(
      leagueId as WhistleTaxonomyLeague,
      game as Parameters<typeof computeGameDispositionCounts>[1],
    );
  }

  const total = whistleTotal(leagueId, game);
  const split = splitAggregateWhistleCount("nba", total);
  return { subjective: split.subjective, administrative: split.administrative };
}

export function classifyAdminRatio(
  adminRatio: number,
  leagueId: LeagueId = "nba",
): RefereeArchetypeId {
  const thresholds = archetypeThresholdsForLeague(leagueId);
  if (adminRatio > thresholds.procedural) return "procedural-stickler";
  if (adminRatio < thresholds.gameManager) return "game-flow-manager";
  return "balanced";
}

export function whistleCoefficientOfVariation(perGameWhistles: number[]): number {
  if (perGameWhistles.length === 0) return 0;
  const mean =
    perGameWhistles.reduce((sum, value) => sum + value, 0) / perGameWhistles.length;
  if (mean <= 0) return 0;
  return populationStdDev(perGameWhistles) / mean;
}

export function consistencyScoreFromWhistleRates(
  perGameWhistles: number[],
  minSampleGames: number = SAMPLE_SIZE_THRESHOLD,
): number | null {
  if (perGameWhistles.length < minSampleGames) return null;

  const coefficientOfVariation = whistleCoefficientOfVariation(perGameWhistles);
  const raw = 10 - (coefficientOfVariation / 0.5) * 9;
  return Math.max(1, Math.min(10, Math.round(raw)));
}

export function volatilityFromConsistencyScore(
  consistencyScore: number,
  coefficientOfVariation: number,
): { volatilityLabel: "High" | "Low"; handicappingSignal: "Risk" | "Stability" } {
  if (
    consistencyScore <= 4 ||
    coefficientOfVariation >= CONSISTENCY_CV_VOLATILE_THRESHOLD
  ) {
    return { volatilityLabel: "High", handicappingSignal: "Risk" };
  }
  if (
    consistencyScore >= 7 ||
    coefficientOfVariation <= CONSISTENCY_CV_STABLE_THRESHOLD
  ) {
    return { volatilityLabel: "Low", handicappingSignal: "Stability" };
  }
  return consistencyScore >= 5
    ? { volatilityLabel: "Low", handicappingSignal: "Stability" }
    : { volatilityLabel: "High", handicappingSignal: "Risk" };
}

export function buildArchetypeTerminalBlurb(
  archetype: RefereeArchetypeId,
  consistencyScore: number,
  coefficientOfVariation: number,
): string {
  const displayName = ARCHETYPE_DISPLAY_NAMES[archetype];
  const primaryFoulType = ARCHETYPE_PRIMARY_FOUL_TYPE[archetype];
  const { volatilityLabel, handicappingSignal } = volatilityFromConsistencyScore(
    consistencyScore,
    coefficientOfVariation,
  );

  return `A ${displayName} who manages game-flow via ${primaryFoulType}. Volatility is ${volatilityLabel}, indicating ${handicappingSignal} for total-game handicapping.`;
}

function isCloseGame(game: ArchetypeGameInput): boolean {
  return Math.abs(game.homeScore - game.awayScore) < CLOSE_GAME_SCORE_DIFF_THRESHOLD;
}

export const DEFAULT_LEVERAGE_STATS: Pick<
  OfficialStats,
  | "leverage_index"
  | "leverage_profile"
  | "early_period_foul_rate"
  | "high_pressure_foul_rate"
  | "leverage_sample_games"
  | "close_game_sample"
  | "split_backed_games"
  | "tactical_event_backed_games"
  | "intentional_foul_noise_filtered"
  | "leverage_method_note"
  | "pressure_index"
  | "pressure_tendency_label"
  | "pressure_baseline_whistle_rate"
  | "pressure_context_whistle_rate"
> = {
  leverage_index: null,
  leverage_profile: "neutral",
  early_period_foul_rate: null,
  high_pressure_foul_rate: null,
  leverage_sample_games: 0,
  close_game_sample: 0,
  split_backed_games: 0,
  tactical_event_backed_games: 0,
  intentional_foul_noise_filtered: true,
  leverage_method_note: "",
  pressure_index: null,
  pressure_tendency_label: "insufficient-sample",
  pressure_baseline_whistle_rate: null,
  pressure_context_whistle_rate: null,
};

export function toOfficialStats(
  result: Omit<RefereeArchetypeResult, "blurb" | "displayName">,
): OfficialStats {
  return {
    primary_archetype: result.primary_archetype,
    consistency_score: result.consistency_score,
    admin_ratio: result.admin_ratio,
    pressure_sensitive: result.pressure_sensitive,
    pressure_delta_pct: result.pressure_delta_pct,
    sample_games: result.sample_games,
    last_calculated: result.last_calculated,
    ...DEFAULT_LEVERAGE_STATS,
  };
}

export function computeRefereeArchetype(
  leagueId: LeagueId,
  games: ArchetypeGameInput[],
  options?: { sampleWindow?: number; generatedAt?: string; minSampleGames?: number },
): RefereeArchetypeResult | null {
  const sampleWindow = options?.sampleWindow ?? ARCHETYPE_SAMPLE_WINDOW;
  const minSampleGames = options?.minSampleGames ?? SAMPLE_SIZE_THRESHOLD;
  const sampleGames = games.slice(-sampleWindow);
  if (sampleGames.length < minSampleGames) return null;

  let subjectiveTotal = 0;
  let administrativeTotal = 0;
  let closeWhistleSum = 0;
  let closeGameCount = 0;
  let openWhistleSum = 0;
  let openGameCount = 0;
  const perGameWhistles: number[] = [];

  for (const game of sampleGames) {
    const counts = dispositionCounts(leagueId, game);
    subjectiveTotal += counts.subjective;
    administrativeTotal += counts.administrative;

    const whistles = whistleTotal(leagueId, game);
    perGameWhistles.push(whistles);

    if (isCloseGame(game)) {
      closeWhistleSum += whistles;
      closeGameCount += 1;
    } else {
      openWhistleSum += whistles;
      openGameCount += 1;
    }
  }

  const subjective = subjectiveTotal || 1;
  const adminRatio = round3(administrativeTotal / subjective);
  const primaryArchetype = classifyAdminRatio(adminRatio, leagueId);

  let pressureDeltaPct: number | null = null;
  if (closeGameCount >= 3 && openGameCount >= 3 && openWhistleSum > 0) {
    const closeRate = closeWhistleSum / closeGameCount;
    const openRate = openWhistleSum / openGameCount;
    pressureDeltaPct = round3((closeRate - openRate) / openRate);
  }

  const pressureSensitive =
    pressureDeltaPct !== null &&
    pressureDeltaPct > CLOSE_GAME_PRESSURE_DELTA_THRESHOLD;

  const coefficientOfVariation = whistleCoefficientOfVariation(perGameWhistles);
  const consistencyScore =
    sampleGames.length >= minSampleGames
      ? consistencyScoreFromWhistleRates(perGameWhistles, minSampleGames)
      : null;
  if (consistencyScore === null) return null;

  const { volatilityLabel, handicappingSignal } = volatilityFromConsistencyScore(
    consistencyScore,
    coefficientOfVariation,
  );

  const generatedAt = options?.generatedAt ?? new Date().toISOString();

  return {
    primary_archetype: primaryArchetype,
    admin_ratio: adminRatio,
    pressure_sensitive: pressureSensitive,
    pressure_delta_pct: pressureDeltaPct,
    consistency_score: consistencyScore,
    sample_games: sampleGames.length,
    last_calculated: generatedAt,
    ...DEFAULT_LEVERAGE_STATS,
    displayName: ARCHETYPE_DISPLAY_NAMES[primaryArchetype],
    primaryFoulType: ARCHETYPE_PRIMARY_FOUL_TYPE[primaryArchetype],
    coefficientOfVariation: round3(coefficientOfVariation),
    volatilityLabel,
    handicappingSignal,
    blurb: buildArchetypeTerminalBlurb(
      primaryArchetype,
      consistencyScore,
      coefficientOfVariation,
    ),
    data_quality: sampleGames.length >= minSampleGames ? "ok" : "insufficient",
  };
}

export function normalizeOfficialStats(raw: unknown): OfficialStats | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  const primary =
    value.primary_archetype ?? value.primaryArchetype ?? value.primaryArchetypeId;
  const consistency = value.consistency_score ?? value.consistencyScore;

  if (typeof primary !== "string" || typeof consistency !== "number") return null;

  return {
    primary_archetype: normalizeArchetypeId(primary),
    consistency_score: consistency,
    admin_ratio:
      typeof value.admin_ratio === "number"
        ? value.admin_ratio
        : typeof value.adminRatio === "number"
          ? value.adminRatio
          : 1,
    pressure_sensitive:
      typeof value.pressure_sensitive === "boolean"
        ? value.pressure_sensitive
        : Boolean(value.pressureSensitive),
    pressure_delta_pct:
      typeof value.pressure_delta_pct === "number"
        ? value.pressure_delta_pct
        : typeof value.pressureDeltaPct === "number"
          ? value.pressureDeltaPct
          : null,
    sample_games:
      typeof value.sample_games === "number"
        ? value.sample_games
        : typeof value.sampleGames === "number"
          ? value.sampleGames
          : 0,
    last_calculated:
      typeof value.last_calculated === "string"
        ? value.last_calculated
        : typeof value.lastCalculated === "string"
          ? value.lastCalculated
          : new Date().toISOString(),
    leverage_index:
      typeof value.leverage_index === "number"
        ? value.leverage_index
        : typeof value.leverageIndex === "number"
          ? value.leverageIndex
          : null,
    leverage_profile:
      value.leverage_profile === "high-leverage-sensitivity" ||
      value.leverage_profile === "swallows-whistle" ||
      value.leverage_profile === "neutral"
        ? value.leverage_profile
        : value.leverageProfile === "high-leverage-sensitivity" ||
            value.leverageProfile === "swallows-whistle" ||
            value.leverageProfile === "neutral"
          ? value.leverageProfile
          : "neutral",
    early_period_foul_rate:
      typeof value.early_period_foul_rate === "number"
        ? value.early_period_foul_rate
        : typeof value.earlyPeriodFoulRate === "number"
          ? value.earlyPeriodFoulRate
          : null,
    high_pressure_foul_rate:
      typeof value.high_pressure_foul_rate === "number"
        ? value.high_pressure_foul_rate
        : typeof value.highPressureFoulRate === "number"
          ? value.highPressureFoulRate
          : null,
    leverage_sample_games:
      typeof value.leverage_sample_games === "number"
        ? value.leverage_sample_games
        : typeof value.leverageSampleGames === "number"
          ? value.leverageSampleGames
          : 0,
    close_game_sample:
      typeof value.close_game_sample === "number"
        ? value.close_game_sample
        : typeof value.closeGameSample === "number"
          ? value.closeGameSample
          : 0,
    split_backed_games:
      typeof value.split_backed_games === "number"
        ? value.split_backed_games
        : typeof value.splitBackedGames === "number"
          ? value.splitBackedGames
          : 0,
    pressure_index:
      typeof value.pressure_index === "number"
        ? value.pressure_index
        : typeof value.pressureIndex === "number"
          ? value.pressureIndex
          : null,
    pressure_tendency_label:
      typeof value.pressure_tendency_label === "string"
        ? value.pressure_tendency_label
        : typeof value.pressureTendencyLabel === "string"
          ? value.pressureTendencyLabel
          : "insufficient-sample",
    pressure_baseline_whistle_rate:
      typeof value.pressure_baseline_whistle_rate === "number"
        ? value.pressure_baseline_whistle_rate
        : typeof value.pressureBaselineWhistleRate === "number"
          ? value.pressureBaselineWhistleRate
          : null,
    pressure_context_whistle_rate:
      typeof value.pressure_context_whistle_rate === "number"
        ? value.pressure_context_whistle_rate
        : typeof value.pressureContextWhistleRate === "number"
          ? value.pressureContextWhistleRate
          : null,
  };
}

export function officialStatsFromProfile(
  profile: { officialStats?: OfficialStats | Record<string, unknown> },
): OfficialStats | null {
  if (!profile.officialStats) return null;
  return normalizeOfficialStats(profile.officialStats);
}

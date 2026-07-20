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
export const ARCHETYPE_MIN_SAMPLE_GAMES = 5;
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

export function classifyAdminRatio(adminRatio: number): RefereeArchetypeId {
  if (adminRatio > ADMIN_RATIO_PROCEDURAL_THRESHOLD) return "procedural-stickler";
  if (adminRatio < ADMIN_RATIO_GAME_MANAGER_THRESHOLD) return "game-flow-manager";
  return "balanced";
}

export function whistleCoefficientOfVariation(perGameWhistles: number[]): number {
  if (perGameWhistles.length === 0) return 0;
  const mean =
    perGameWhistles.reduce((sum, value) => sum + value, 0) / perGameWhistles.length;
  if (mean <= 0) return 0;
  return populationStdDev(perGameWhistles) / mean;
}

export function consistencyScoreFromWhistleRates(perGameWhistles: number[]): number {
  if (perGameWhistles.length < ARCHETYPE_MIN_SAMPLE_GAMES) return 5;

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
  };
}

export function computeRefereeArchetype(
  leagueId: LeagueId,
  games: ArchetypeGameInput[],
  options?: { sampleWindow?: number; generatedAt?: string },
): RefereeArchetypeResult | null {
  const sampleWindow = options?.sampleWindow ?? ARCHETYPE_SAMPLE_WINDOW;
  const sampleGames = games.slice(-sampleWindow);
  if (sampleGames.length < ARCHETYPE_MIN_SAMPLE_GAMES) return null;

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
  const primaryArchetype = classifyAdminRatio(adminRatio);

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
  const consistencyScore = consistencyScoreFromWhistleRates(perGameWhistles);
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
  };
}

export function officialStatsFromProfile(
  profile: { officialStats?: OfficialStats | Record<string, unknown> },
): OfficialStats | null {
  if (!profile.officialStats) return null;
  return normalizeOfficialStats(profile.officialStats);
}

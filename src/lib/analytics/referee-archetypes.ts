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
};

export const ARCHETYPE_DISPLAY_NAMES: Record<RefereeArchetypeId, string> = {
  "procedural-stickler": "Procedural Stickler",
  "game-manager": "Game Manager",
  balanced: "Balanced",
};

export const ARCHETYPE_BLURBS: Record<RefereeArchetypeId, string> = {
  "procedural-stickler":
    "This official is a Procedural Stickler. Expect high frequency of non-contact infractions.",
  "game-manager":
    "This official is a Game Manager. Expect fewer procedural whistles and more gameplay flow.",
  balanced:
    "This official runs a Balanced whistle profile. Subjective and procedural mix tracks league norms.",
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
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
  if (adminRatio < ADMIN_RATIO_GAME_MANAGER_THRESHOLD) return "game-manager";
  return "balanced";
}

export function consistencyScoreFromWhistleRates(perGameWhistles: number[]): number {
  if (perGameWhistles.length < ARCHETYPE_MIN_SAMPLE_GAMES) return 5;

  const std = populationStdDev(perGameWhistles);
  const mean =
    perGameWhistles.reduce((sum, value) => sum + value, 0) / perGameWhistles.length;
  if (mean <= 0) return 5;

  const coefficientOfVariation = std / mean;
  const raw = 10 - (coefficientOfVariation / 0.5) * 9;
  return Math.max(1, Math.min(10, Math.round(raw)));
}

function isCloseGame(game: ArchetypeGameInput): boolean {
  return Math.abs(game.homeScore - game.awayScore) < CLOSE_GAME_SCORE_DIFF_THRESHOLD;
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

  const consistencyScore = consistencyScoreFromWhistleRates(perGameWhistles);

  return {
    primaryArchetype,
    adminRatio,
    pressureSensitive,
    pressureDeltaPct,
    consistencyScore,
    sampleGames: sampleGames.length,
    lastCalculated: options?.generatedAt ?? new Date().toISOString(),
    displayName: ARCHETYPE_DISPLAY_NAMES[primaryArchetype],
    blurb: ARCHETYPE_BLURBS[primaryArchetype],
  };
}

export function officialStatsFromProfile(
  profile: { officialStats?: OfficialStats },
): OfficialStats | null {
  return profile.officialStats ?? null;
}

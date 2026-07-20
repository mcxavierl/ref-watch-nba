import {
  isWhistleTaxonomyLeague,
  splitAggregateWhistleCount,
  type WhistleTaxonomyLeague,
} from "@/config/penalty-types";
import type { LeagueId } from "@/lib/leagues";
import type { NflPenaltyEvent } from "@/lib/types";
import { computeGameDispositionCounts } from "@/lib/whistle-disposition";

export type FoulCategoryGameInput = {
  totalFouls: number;
  homeFlags?: number;
  awayFlags?: number;
  homeMinors?: number;
  awayMinors?: number;
  subjectiveFlags?: number;
  administrativeFlags?: number;
  penaltyEvents?: NflPenaltyEvent[];
};

export type FoulCategoryResolutionSource = "direct" | "resolved" | "estimated";

export type FoulCategoryResolution = {
  subjective: number;
  administrative: number;
  source: FoulCategoryResolutionSource;
};

export const HARD_TRUTH_SEASON_START_YEAR = 2023;

function seasonStartYear(seasonLabel: string): number {
  return Number.parseInt(seasonLabel.split("-")[0] ?? "", 10);
}

export function isHardTruthSeason(seasonLabel: string): boolean {
  return seasonStartYear(seasonLabel) >= HARD_TRUTH_SEASON_START_YEAR;
}

function whistleTotal(leagueId: LeagueId, game: FoulCategoryGameInput): number {
  if (leagueId === "nfl") {
    return (game.homeFlags ?? 0) + (game.awayFlags ?? 0);
  }
  if (leagueId === "nhl") {
    return (game.homeMinors ?? 0) + (game.awayMinors ?? 0);
  }
  return game.totalFouls;
}

function hasDirectCategoryAssignments(game: FoulCategoryGameInput): boolean {
  return game.subjectiveFlags !== undefined && game.administrativeFlags !== undefined;
}

/**
 * Resolve subjective/administrative foul categories for elite analytics.
 * 2023-2026 seasons prioritize direct category assignments as hard truth.
 * 2021-2022 seasons backfill missing categories via taxonomy resolution.
 */
export function resolveRefProfileFoulCategory(
  leagueId: LeagueId,
  game: FoulCategoryGameInput,
  seasonLabel: string,
): FoulCategoryResolution {
  if (isHardTruthSeason(seasonLabel) && hasDirectCategoryAssignments(game)) {
    return {
      subjective: game.subjectiveFlags!,
      administrative: game.administrativeFlags!,
      source: "direct",
    };
  }

  if (hasDirectCategoryAssignments(game)) {
    return {
      subjective: game.subjectiveFlags!,
      administrative: game.administrativeFlags!,
      source: "direct",
    };
  }

  if (isWhistleTaxonomyLeague(leagueId)) {
    const counts = computeGameDispositionCounts(
      leagueId as WhistleTaxonomyLeague,
      game,
    );
    return {
      subjective: counts.subjective,
      administrative: counts.administrative,
      source: "resolved",
    };
  }

  const total = whistleTotal(leagueId, game);
  const split = splitAggregateWhistleCount("nba", total);
  return {
    subjective: split.subjective,
    administrative: split.administrative,
    source: "estimated",
  };
}

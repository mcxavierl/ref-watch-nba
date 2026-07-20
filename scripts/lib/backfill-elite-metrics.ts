import {
  computeRefereeArchetype,
  toOfficialStats,
} from "../../src/lib/analytics/referee-archetypes";
import type { ArchetypeGameInput } from "../../src/lib/analytics/referee-archetypes";
import {
  computeLeverageIndex,
  leverageFieldsFromResult,
} from "../../src/lib/analytics/leverage-sensitivity";
import type { LeverageGameInput } from "../../src/lib/analytics/leverage-sensitivity";
import {
  resolveRefProfileFoulCategory,
  type FoulCategoryGameInput,
} from "../../src/lib/analytics/resolve-ref-profile-foul-category";
import type { LeagueId } from "../../src/lib/leagues";
import { refSlug } from "../../src/lib/ref-slug";
import type {
  RefGameRecord,
  RefProfile,
  SeasonOfficialStatsEntry,
} from "../../src/lib/types";
import type { GameLogEntry } from "./game-logs";

export const BACKFILL_CALENDAR_YEARS = [2021, 2022, 2023, 2024, 2025, 2026] as const;
export const BACKFILL_MIN_SAMPLE_GAMES = 10;

export type BackfillErrorRecord = {
  leagueId: LeagueId;
  season: string;
  officialSlug: string;
  officialName: string;
  reason: "foul_integrity_mismatch";
  calculatedFouls: number;
  databaseFouls: number;
  calculatedGames: number;
  databaseGames: number;
};

export function calendarYearToSeasonLabel(year: number): string {
  const end = String((year + 1) % 100).padStart(2, "0");
  return `${year}-${end}`;
}

export function backfillSeasonLabels(): string[] {
  return BACKFILL_CALENDAR_YEARS.map(calendarYearToSeasonLabel);
}

export function whistleTotalForGame(
  leagueId: LeagueId,
  game: Pick<
    GameLogEntry,
    "totalFouls" | "homeFlags" | "awayFlags" | "homeMinors" | "awayMinors"
  >,
): number {
  if (leagueId === "nfl") {
    return (game.homeFlags ?? 0) + (game.awayFlags ?? 0);
  }
  if (leagueId === "nhl") {
    return (game.homeMinors ?? 0) + (game.awayMinors ?? 0);
  }
  return game.totalFouls;
}

export function whistleTotalForRefGameRecord(
  leagueId: LeagueId,
  game: RefGameRecord,
): number {
  if (leagueId === "nfl") {
    return (game.homeFlags ?? 0) + (game.awayFlags ?? 0);
  }
  if (leagueId === "nhl") {
    return (game.homeMinors ?? 0) + (game.awayMinors ?? 0);
  }
  return game.totalFouls;
}

export function verifyFoulIntegrity(
  calculatedTotal: number,
  databaseTotal: number,
  calculatedGames: number,
  databaseGames: number,
): { ok: boolean; delta: number } {
  const delta = calculatedTotal - databaseTotal;
  return {
    ok: delta === 0 && calculatedGames === databaseGames,
    delta,
  };
}

function toFoulCategoryInput(game: GameLogEntry): FoulCategoryGameInput {
  return {
    totalFouls: game.totalFouls,
    homeFlags: game.homeFlags,
    awayFlags: game.awayFlags,
    homeMinors: game.homeMinors,
    awayMinors: game.awayMinors,
    subjectiveFlags: (game as GameLogEntry & { subjectiveFlags?: number }).subjectiveFlags,
    administrativeFlags: (game as GameLogEntry & { administrativeFlags?: number })
      .administrativeFlags,
    penaltyEvents: game.penaltyEvents,
  };
}

function toArchetypeInput(
  leagueId: LeagueId,
  game: GameLogEntry,
  seasonLabel: string,
): ArchetypeGameInput {
  const categories = resolveRefProfileFoulCategory(
    leagueId,
    toFoulCategoryInput(game),
    seasonLabel,
  );

  return {
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    totalFouls: game.totalFouls,
    homeFlags: game.homeFlags,
    awayFlags: game.awayFlags,
    homeMinors: game.homeMinors,
    awayMinors: game.awayMinors,
    subjectiveFlags: categories.subjective,
    administrativeFlags: categories.administrative,
    penaltyEvents: game.penaltyEvents,
  };
}

function toLeverageInput(game: GameLogEntry): LeverageGameInput {
  return {
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    totalFouls: game.totalFouls,
    homeFlags: game.homeFlags,
    awayFlags: game.awayFlags,
    homeMinors: game.homeMinors,
    awayMinors: game.awayMinors,
    wentToOvertime: game.wentToOvertime,
    whistlePeriodSplits: game.whistlePeriodSplits,
  };
}

export function databaseWhistleTotalsForSeason(
  leagueId: LeagueId,
  profile: RefProfile,
  seasonLabel: string,
): { games: number; fouls: number } {
  const seasonGames = profile.recentGames.filter((game) => game.season === seasonLabel);
  let fouls = 0;
  for (const game of seasonGames) {
    fouls += whistleTotalForRefGameRecord(leagueId, game);
  }
  return { games: seasonGames.length, fouls };
}

export function calculatedWhistleTotalsForSeason(
  leagueId: LeagueId,
  games: GameLogEntry[],
): { games: number; fouls: number } {
  let fouls = 0;
  for (const game of games) {
    fouls += whistleTotalForGame(leagueId, game);
  }
  return { games: games.length, fouls };
}

export function hasSeasonOfficialStats(
  profile: RefProfile,
  seasonLabel: string,
): boolean {
  return profile.officialStatsBySeason?.[seasonLabel] !== undefined;
}

export function buildSeasonOfficialStatsEntry(
  leagueId: LeagueId,
  seasonLabel: string,
  games: GameLogEntry[],
  generatedAt: string,
): SeasonOfficialStatsEntry | null {
  if (games.length < BACKFILL_MIN_SAMPLE_GAMES) {
    return {
      status: "INSUFFICIENT_DATA",
      sample_games: games.length,
      last_calculated: generatedAt,
    };
  }

  const archetypeGames = games.map((game) => toArchetypeInput(leagueId, game, seasonLabel));
  const leverageGames = games.map(toLeverageInput);
  const archetype = computeRefereeArchetype(leagueId, archetypeGames, {
    sampleWindow: games.length,
    generatedAt,
    minSampleGames: BACKFILL_MIN_SAMPLE_GAMES,
  });
  const leverage = computeLeverageIndex(leagueId, leverageGames, {
    sampleWindow: games.length,
    minSampleGames: BACKFILL_MIN_SAMPLE_GAMES,
  });

  if (!archetype) {
    return {
      status: "INSUFFICIENT_DATA",
      sample_games: games.length,
      last_calculated: generatedAt,
    };
  }

  return {
    status: "ok",
    ...toOfficialStats(archetype),
    ...leverageFieldsFromResult(leverage),
  };
}

export function indexOfficialGamesBySeason(
  games: GameLogEntry[],
): Map<string, Map<string, GameLogEntry[]>> {
  const byOfficial = new Map<string, Map<string, GameLogEntry[]>>();

  for (const game of games) {
    for (const official of game.officials) {
      const slug = refSlug(official.name, official.number);
      const seasonBuckets = byOfficial.get(slug) ?? new Map<string, GameLogEntry[]>();
      const bucket = seasonBuckets.get(game.season) ?? [];
      bucket.push(game);
      seasonBuckets.set(game.season, bucket);
      byOfficial.set(slug, seasonBuckets);
    }
  }

  return byOfficial;
}

import {
  computeRefereeArchetype,
  officialStatsFromProfile,
  toOfficialStats,
  type ArchetypeGameInput,
} from "../../src/lib/analytics/referee-archetypes";
import {
  computeLeverageIndex,
  leverageFieldsFromResult,
} from "../../src/lib/analytics/leverage-sensitivity";
import type { LeagueId } from "../../src/lib/leagues";
import { refSlug } from "../../src/lib/ref-slug";
import type { RefOfficial, RefProfile } from "../../src/lib/types";
import type { GameLogEntry } from "./game-logs";

function officialSlug(official: RefOfficial): string {
  return refSlug(official.name, official.number);
}

function toArchetypeInput(game: GameLogEntry): ArchetypeGameInput {
  return {
    homeScore: game.homeScore,
    awayScore: game.awayScore,
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

function toLeverageInput(game: GameLogEntry) {
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

export function attachRefArchetypesFromGames(
  profiles: RefProfile[],
  games: GameLogEntry[],
  leagueId: LeagueId,
): RefProfile[] {
  const gamesByOfficial = new Map<string, ArchetypeGameInput[]>();
  const leverageGamesByOfficial = new Map<
    string,
    ReturnType<typeof toLeverageInput>[]
  >();

  for (const game of games) {
    const input = toArchetypeInput(game);
    const leverageInput = toLeverageInput(game);
    for (const official of game.officials) {
      const slug = officialSlug(official);
      const bucket = gamesByOfficial.get(slug) ?? [];
      bucket.push(input);
      gamesByOfficial.set(slug, bucket);

      const leverageBucket = leverageGamesByOfficial.get(slug) ?? [];
      leverageBucket.push(leverageInput);
      leverageGamesByOfficial.set(slug, leverageBucket);
    }
  }

  return profiles.map((profile) => {
    const officialGames = gamesByOfficial.get(profile.slug) ?? [];
    const archetype = computeRefereeArchetype(leagueId, officialGames);
    const leverageGames = leverageGamesByOfficial.get(profile.slug) ?? [];
    const leverage = computeLeverageIndex(leagueId, leverageGames);

    if (!archetype && leverage.data_quality === "insufficient") return profile;

    const baseStats = archetype
      ? toOfficialStats(archetype)
      : officialStatsFromProfile(profile);
    if (!baseStats) return profile;

    return {
      ...profile,
      officialStats: {
        ...baseStats,
        ...leverageFieldsFromResult(leverage),
      },
    };
  });
}

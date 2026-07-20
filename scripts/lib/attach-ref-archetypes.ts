import {
  computeRefereeArchetype,
  type ArchetypeGameInput,
} from "../../src/lib/analytics/referee-archetypes";
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

export function attachRefArchetypesFromGames(
  profiles: RefProfile[],
  games: GameLogEntry[],
  leagueId: LeagueId,
): RefProfile[] {
  const gamesByOfficial = new Map<string, ArchetypeGameInput[]>();

  for (const game of games) {
    const input = toArchetypeInput(game);
    for (const official of game.officials) {
      const slug = officialSlug(official);
      const bucket = gamesByOfficial.get(slug) ?? [];
      bucket.push(input);
      gamesByOfficial.set(slug, bucket);
    }
  }

  return profiles.map((profile) => {
    const officialGames = gamesByOfficial.get(profile.slug) ?? [];
    const archetype = computeRefereeArchetype(leagueId, officialGames);
    if (!archetype) return profile;

    return {
      ...profile,
      officialStats: {
        primaryArchetype: archetype.primaryArchetype,
        adminRatio: archetype.adminRatio,
        pressureSensitive: archetype.pressureSensitive,
        pressureDeltaPct: archetype.pressureDeltaPct,
        consistencyScore: archetype.consistencyScore,
        sampleGames: archetype.sampleGames,
        lastCalculated: archetype.lastCalculated,
      },
    };
  });
}

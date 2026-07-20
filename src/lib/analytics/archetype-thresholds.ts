import type { LeagueId } from "@/lib/leagues";

export type ArchetypeLeagueThresholds = {
  /** Admin/subjective ratio above this value classifies a Procedural Stickler. */
  procedural: number;
  /** Admin/subjective ratio below this value classifies a Game-Flow Manager. */
  gameManager: number;
};

/** League-specific Admin-to-Subjective ratio bands for archetype classification. */
export const ARCHETYPE_LEAGUE_THRESHOLDS: Record<
  "nba" | "nfl" | "wnba",
  ArchetypeLeagueThresholds
> = {
  nba: { procedural: 1.5, gameManager: 0.7 },
  nfl: { procedural: 1.8, gameManager: 0.6 },
  wnba: { procedural: 1.4, gameManager: 0.75 },
};

const DEFAULT_ARCHETYPE_THRESHOLDS: ArchetypeLeagueThresholds = {
  procedural: 1.5,
  gameManager: 0.7,
};

export function archetypeThresholdsForLeague(
  leagueId: LeagueId,
): ArchetypeLeagueThresholds {
  if (leagueId === "nba" || leagueId === "nfl" || leagueId === "wnba") {
    return ARCHETYPE_LEAGUE_THRESHOLDS[leagueId];
  }
  return DEFAULT_ARCHETYPE_THRESHOLDS;
}

import {
  classifyAdminRatio,
  officialStatsFromProfile,
  type ArchetypeGameInput,
} from "@/lib/analytics/referee-archetypes";
import {
  isWhistleTaxonomyLeague,
  splitAggregateWhistleCount,
  type WhistleTaxonomyLeague,
} from "@/config/penalty-types";
import { crewIdFromOfficials } from "@/lib/schema/foul-events";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { LeagueId } from "@/lib/leagues";
import { populationStdDev } from "@/lib/metric-significance";
import { refSlug } from "@/lib/ref-slug";
import type { RefereeArchetypeId, RefProfile } from "@/lib/types";
import { computeGameDispositionCounts } from "@/lib/whistle-disposition";

/** Std dev of member admin ratios above this marks a mismatched crew. */
export const ARCHETYPE_VARIANCE_MISMATCHED_THRESHOLD = 0.35;

export type CrewMemberArchetypeProfile = {
  officialId: string;
  officialName: string;
  adminRatio: number;
  primaryArchetype: RefereeArchetypeId;
};

export type CrewSynergyResult = {
  gameId: string;
  crewId: string;
  leagueId: LeagueId;
  crewAdminRatio: number;
  crewArchetypeProfile: RefereeArchetypeId;
  archetypeVariance: number;
  crewCohesion: "unified" | "mismatched" | "balanced";
  members: CrewMemberArchetypeProfile[];
  edgeNote: string;
};

export type CrewSynergyInput = {
  leagueId: LeagueId;
  game: RuntimeGameLogEntry;
  getProfile: (officialId: string) => RefProfile | undefined;
};

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function gameToArchetypeInput(game: RuntimeGameLogEntry): ArchetypeGameInput {
  return {
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    totalFouls: game.totalFouls,
    homeFlags: game.homeFlags,
    awayFlags: game.awayFlags,
    homeMinors: game.homeMinors,
    awayMinors: game.awayMinors,
    subjectiveFlags: game.subjectiveFlags,
    administrativeFlags: game.administrativeFlags,
    penaltyEvents: game.penaltyEvents,
  };
}

export function computeGameAdminRatio(
  leagueId: LeagueId,
  game: RuntimeGameLogEntry,
): number {
  const input = gameToArchetypeInput(game);

  if (isWhistleTaxonomyLeague(leagueId)) {
    const counts = computeGameDispositionCounts(
      leagueId as WhistleTaxonomyLeague,
      input as Parameters<typeof computeGameDispositionCounts>[1],
    );
    return round3(counts.administrative / (counts.subjective || 1));
  }

  const total = game.totalFouls;
  const split = splitAggregateWhistleCount("nba", total);
  return round3(split.administrative / (split.subjective || 1));
}

function resolveMemberAdminRatio(
  profile: RefProfile | undefined,
  leagueId: LeagueId,
): number | null {
  const officialStats = profile ? officialStatsFromProfile(profile) : null;
  if (officialStats) return officialStats.admin_ratio;

  if (leagueId === "nfl" && profile?.nflAnalytics) {
    const subjective = profile.nflAnalytics.avgSubjectiveFlagsPerGame ?? 0;
    const administrative = profile.nflAnalytics.avgAdministrativeFlagsPerGame ?? 0;
    if (subjective > 0) return round3(administrative / subjective);
  }

  return null;
}

export function computeArchetypeVariance(adminRatios: number[]): number {
  if (adminRatios.length <= 1) return 0;
  return round3(populationStdDev(adminRatios));
}

export function classifyCrewCohesion(
  variance: number,
): CrewSynergyResult["crewCohesion"] {
  if (variance >= ARCHETYPE_VARIANCE_MISMATCHED_THRESHOLD) return "mismatched";
  if (variance <= 0.12) return "unified";
  return "balanced";
}

export function buildCrewIntelligenceEdgeNote(
  variance: number,
  cohesion: CrewSynergyResult["crewCohesion"],
): string {
  if (cohesion === "mismatched") {
    return "Warning: High archetype variance detected. Expect inconsistent whistle frequency.";
  }
  if (cohesion === "unified") {
    return "Unified crew profile. Whistle frequency should track predictably with historical tendencies.";
  }
  return "Moderate archetype spread. Monitor late-game foul clustering against pace benchmarks.";
}

export function computeCrewSynergy(input: CrewSynergyInput): CrewSynergyResult | null {
  const { leagueId, game, getProfile } = input;
  if (game.officials.length === 0) return null;

  const crewId = crewIdFromOfficials(game.officials);
  const crewAdminRatio = computeGameAdminRatio(leagueId, game);
  const crewArchetypeProfile = classifyAdminRatio(crewAdminRatio, leagueId);

  const members: CrewMemberArchetypeProfile[] = [];
  const memberRatios: number[] = [];

  for (const official of game.officials) {
    const officialId = refSlug(official.name, official.number);
    const profile = getProfile(officialId);
    const adminRatio = resolveMemberAdminRatio(profile, leagueId);
    if (adminRatio === null) continue;

    memberRatios.push(adminRatio);
    members.push({
      officialId,
      officialName: official.name,
      adminRatio,
      primaryArchetype: classifyAdminRatio(adminRatio, leagueId),
    });
  }

  if (members.length === 0) return null;

  const archetypeVariance = computeArchetypeVariance(memberRatios);
  const crewCohesion = classifyCrewCohesion(archetypeVariance);

  return {
    gameId: game.gameId,
    crewId,
    leagueId,
    crewAdminRatio,
    crewArchetypeProfile,
    archetypeVariance,
    crewCohesion,
    members,
    edgeNote: buildCrewIntelligenceEdgeNote(archetypeVariance, crewCohesion),
  };
}

/** Aggregate admin_ratio by crew_id for all events belonging to a game. */
export function aggregateAdminRatioByCrewId(
  crewId: string,
  gameAdminRatio: number,
): { crew_id: string; admin_ratio: number } {
  return {
    crew_id: crewId,
    admin_ratio: gameAdminRatio,
  };
}

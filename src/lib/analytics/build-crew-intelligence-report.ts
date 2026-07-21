import { computeCrewSynergy } from "@/lib/analytics/crew-synergy";
import { resolveGameForCrewIntelligence } from "@/lib/analytics/resolve-game-for-crew-intelligence";
import { resolveOfficialProfile } from "@/lib/analytics/resolve-official-profile";
import type { LeagueId } from "@/lib/leagues";
import type { RefereeArchetypeId } from "@/lib/types";

export type CrewIntelligenceReport = {
  gameId: string;
  leagueId: LeagueId;
  crewId: string;
  crew_archetype_profile: RefereeArchetypeId;
  archetype_variance: number;
  edge_note: string;
  crewAdminRatio: number;
  crewCohesion: "unified" | "mismatched" | "balanced";
  members: NonNullable<ReturnType<typeof computeCrewSynergy>>["members"];
};

export function buildCrewIntelligenceReport(
  gameId: string,
  leagueId: LeagueId,
): CrewIntelligenceReport | null {
  const resolved = resolveGameForCrewIntelligence(gameId, leagueId);
  if (!resolved) return null;

  const synergy = computeCrewSynergy({
    leagueId: resolved.leagueId,
    game: resolved.game,
    getProfile: (officialId) => resolveOfficialProfile(officialId, leagueId)?.profile,
  });

  if (!synergy) return null;

  return {
    gameId: synergy.gameId,
    leagueId: synergy.leagueId,
    crewId: synergy.crewId,
    crew_archetype_profile: synergy.crewArchetypeProfile,
    archetype_variance: synergy.archetypeVariance,
    edge_note: synergy.edgeNote,
    crewAdminRatio: synergy.crewAdminRatio,
    crewCohesion: synergy.crewCohesion,
    members: synergy.members,
  };
}

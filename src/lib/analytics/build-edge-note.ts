import { ARCHETYPE_DISPLAY_NAMES } from "@/lib/analytics/referee-archetypes";
import type { LeveragePressureProfile, RefereeArchetypeId } from "@/lib/types";

export type EdgeNoteInput = {
  consistencyScore: number;
  consistencyIndex?: number | null;
  leverageProfile: LeveragePressureProfile;
  leverageIndex: number | null;
  archetype: RefereeArchetypeId;
};

export function buildEdgeNote(input: EdgeNoteInput): string {
  const { consistencyScore, consistencyIndex, leverageProfile, leverageIndex, archetype } =
    input;

  const volatile =
    consistencyIndex !== null && consistencyIndex !== undefined
      ? consistencyIndex < 40
      : consistencyScore <= 4;
  const stable =
    consistencyIndex !== null && consistencyIndex !== undefined
      ? consistencyIndex >= 70
      : consistencyScore >= 8;

  if (volatile) {
    return "Volatile ref. Use caution on Over/Under bets.";
  }

  if (leverageProfile === "high-leverage-sensitivity") {
    return "High leverage sensitivity. Expect late foul spikes that can add edge to live Over tickets.";
  }

  if (leverageProfile === "swallows-whistle") {
    return "Swallows the whistle in tight finishes. Unders gain edge when this ref works close games.";
  }

  if (stable && leverageIndex !== null && Math.abs(leverageIndex) <= 0.1) {
    return "Stable whistle profile. Totals track closer to market expectation.";
  }

  const archetypeLabel = ARCHETYPE_DISPLAY_NAMES[archetype];
  return `Neutral edge profile. Cross-check ${archetypeLabel} tendencies against matchup pace before betting totals.`;
}

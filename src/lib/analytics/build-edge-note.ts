import { ARCHETYPE_DISPLAY_NAMES } from "@/lib/analytics/referee-archetypes";
import { HIGH_LEVERAGE_SENSITIVITY_INSIGHT } from "@/lib/analytics/leverage-sensitivity";
import type { LeveragePressureProfile, RefereeArchetypeId } from "@/lib/types";

export type EdgeNoteInput = {
  consistencyScore: number;
  leverageProfile: LeveragePressureProfile;
  leverageIndex: number | null;
  archetype: RefereeArchetypeId;
};

export function buildEdgeNote(input: EdgeNoteInput): string {
  const { consistencyScore, leverageProfile, leverageIndex, archetype } = input;

  if (consistencyScore <= 4) {
    return "Volatile ref. Use caution on Over/Under bets.";
  }

  if (leverageProfile === "high-leverage-sensitivity") {
    return HIGH_LEVERAGE_SENSITIVITY_INSIGHT;
  }

  if (leverageProfile === "swallows-whistle") {
    return "Swallows the whistle in tight finishes. Unders gain edge when this ref works close games.";
  }

  if (consistencyScore >= 8 && leverageIndex !== null && Math.abs(leverageIndex) <= 0.1) {
    return "Stable whistle profile. Totals track closer to market expectation.";
  }

  const archetypeLabel = ARCHETYPE_DISPLAY_NAMES[archetype];
  return `Neutral edge profile. Cross-check ${archetypeLabel} tendencies against matchup pace before betting totals.`;
}

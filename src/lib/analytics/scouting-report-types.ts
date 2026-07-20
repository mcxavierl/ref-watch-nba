import type { LeagueId } from "@/lib/leagues";
import type { OfficialStats, RefereeArchetypeId } from "@/lib/types";

export const SCOUTING_REPORT_SAMPLE_WINDOW = 50;

export const PRESSURE_SENSITIVITY_THRESHOLD = 0.1;

export type ScoutingStyleArchetype = "game-flow" | "rule-enforcer" | "balanced";

export type ScoutingStyleProfile = {
  archetype: ScoutingStyleArchetype;
  subjectiveShare: number;
  administrativeShare: number;
  /** 0 (loose / game-flow) to 100 (strict / procedural). */
  strictnessScore: number;
  gameFlowScore: number;
  label: string;
};

export type GameScoutingMetadata = {
  leagueId: LeagueId;
  isPlayoff?: boolean;
  isPrimetime?: boolean;
  seasonStage?: "regular" | "playoff" | "preseason" | "exhibition";
};

export type ScoutingReport = {
  officialId: string;
  officialName: string;
  leagueId: LeagueId;
  generatedAt: string;
  sampleGames: number;
  sampleWindow: number;
  qualified: boolean;
  /** Elite-tier referee persona from foul categorization ratios. */
  archetype: RefereeArchetypeId;
  archetypeDisplayName: string;
  archetypeBlurb: string;
  /** 1 (volatile) to 10 (highly consistent) whistle-volume profile. */
  consistencyScore: number;
  /** 0-100 whistle predictability score vs league variance baseline. */
  consistencyIndex: number | null;
  consistencyClassificationLabel: string;
  consistencyClassificationDisplay: string;
  officialStats: OfficialStats;
  leverageIndex: number | null;
  leverageProfile: import("@/lib/types").LeveragePressureProfile;
  pressureGauge: import("@/lib/analytics/leverage-sensitivity").PressureGaugeState;
  leverageInsight: string;
  /** Alias for B2B Elite feed consumers. */
  leverageSensitivityIndex: number | null;
  intentionalFoulNoiseFiltered: boolean;
  leverageMethodNote: string;
  edgeNote: string;
  styleProfile: ScoutingStyleProfile;
  pressureSensitive: boolean;
  pressureDeltaPct: number | null;
  baselineWhistlesPerGame: number;
  pressureWhistlesPerGame: number | null;
  summary: string;
  insights: string[];
  eventBackedGames: number;
};

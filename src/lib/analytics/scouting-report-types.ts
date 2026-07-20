import type { LeagueId } from "@/lib/leagues";

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
  styleProfile: ScoutingStyleProfile;
  pressureSensitive: boolean;
  pressureDeltaPct: number | null;
  baselineWhistlesPerGame: number;
  pressureWhistlesPerGame: number | null;
  summary: string;
  insights: string[];
  eventBackedGames: number;
};

export type IntelligenceMetricType =
  | "Whistle Acceleration"
  | "Scoring Pace"
  | "Crew Baseline";

export const INTELLIGENCE_METRIC_TYPES = [
  "Whistle Acceleration",
  "Scoring Pace",
  "Crew Baseline",
] as const satisfies readonly IntelligenceMetricType[];

export function isIntelligenceMetricType(
  value: unknown,
): value is IntelligenceMetricType {
  return (
    typeof value === "string" &&
    (INTELLIGENCE_METRIC_TYPES as readonly string[]).includes(value)
  );
}

export type IntelligenceCardContent = {
  gameId: string;
  proofSubtext: string;
  crewPill: string;
  crewCitation: string;
  primarySignalLabel: string;
  primarySignalBody: string;
  metricType: IntelligenceMetricType;
  metricDeltaPct: number;
  sampleFootnote: string;
  sampleGames: number;
  premiumDriverTeaser: string;
};

export type CitationEventAction = "COPY_CITATION";

export function isCitationEventAction(value: unknown): value is CitationEventAction {
  return value === "COPY_CITATION";
}

export type CitationEventPayload = {
  gameId: string;
  refCrew: string;
  metricType: IntelligenceMetricType;
  action: CitationEventAction;
};

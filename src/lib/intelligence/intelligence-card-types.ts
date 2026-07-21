export type IntelligenceMetricType =
  | "Whistle Acceleration"
  | "Scoring Pace"
  | "Crew Baseline";

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

export type CitationEventPayload = {
  gameId: string;
  refCrew: string;
  metricType: IntelligenceMetricType;
  action: CitationEventAction;
};

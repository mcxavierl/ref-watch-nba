export const MEDIA_CARD_WIDTH = 1920;
export const MEDIA_CARD_HEIGHT = 1080;

export type MediaCardRefProfile = {
  name: string;
  slug: string;
  sport: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba";
  role?: string;
};

export type MediaCardContent = {
  leagueLabel: string;
  matchupBadge: string;
  heroMetric: string;
  heroMetricTone: "positive" | "negative" | "neutral";
  primaryRef: MediaCardRefProfile;
  crewLabel: string;
  archetypeTag: string;
  evidenceBullets: string[];
  confidencePct: number;
  evidenceStrength: number;
  metricLabel: string;
  sampleGames: number;
};

export type ProducerCopySections = {
  lowerThird: string;
  teleprompter: string;
  producerBullets: string;
  all: string;
};

export type MediaBroadcastExport = {
  content: MediaCardContent;
  producerCopy: ProducerCopySections;
};

const CREW_ROLE_LABELS: Record<string, string> = {
  crew_chief: "Crew Chief",
  referee: "Referee",
  umpire: "Umpire",
  linesman: "Linesman",
  line_judge: "Line Judge",
  back_judge: "Back Judge",
  side_judge: "Side Judge",
  field_judge: "Field Judge",
  head_linesman: "Head Linesman",
  down_judge: "Down Judge",
};

export function formatCrewRole(role?: string): string | undefined {
  if (!role) return undefined;
  return CREW_ROLE_LABELS[role] ?? role.replace(/_/g, " ");
}

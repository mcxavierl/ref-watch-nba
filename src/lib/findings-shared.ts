export type FindingCategory =
  | "league-trend"
  | "ref-outlier"
  | "team-crew"
  | "whistle-extreme"
  | "scoring-extreme"
  | "ats-edge"
  | "ou-edge"
  | "ref-team-split";

export interface FindingLink {
  label: string;
  href: string;
}

export interface FindingStat {
  label: string;
  value: string;
  detail?: string;
}

export interface Finding {
  id: string;
  category: FindingCategory;
  headline: string;
  summary: string;
  explainer?: string;
  stats: FindingStat[];
  sampleNote: string;
  links: FindingLink[];
}

export interface ScoredFindingBase extends Finding {
  score: number;
  sampleGames: number;
}

export function rankScore(
  effectSize: number,
  sampleGames: number,
  minSample: number,
): number {
  const sampleWeight = Math.min(1, sampleGames / (minSample * 2));
  return Math.abs(effectSize) * Math.sqrt(sampleGames) * sampleWeight;
}

export function dedupeFindingsByCategory(
  ranked: ScoredFindingBase[],
  limit: number,
): Finding[] {
  const seen = new Set<FindingCategory>();
  const picked: Finding[] = [];

  for (const item of ranked) {
    if (seen.has(item.category) && picked.length >= 3) continue;
    seen.add(item.category);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip scoring fields
    const { score, sampleGames, ...finding } = item;
    picked.push(finding);
    if (picked.length >= limit) break;
  }

  return picked;
}

export const FINDING_CATEGORY_LABELS: Record<FindingCategory, string> = {
  "league-trend": "League trend",
  "ref-outlier": "Ref outlier",
  "team-crew": "Team crew",
  "whistle-extreme": "Whistle extreme",
  "scoring-extreme": "Scoring extreme",
  "ats-edge": "ATS edge",
  "ou-edge": "O/U edge",
  "ref-team-split": "Ref–team split",
};

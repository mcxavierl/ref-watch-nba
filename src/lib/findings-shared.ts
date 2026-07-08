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

import type { ConfidenceTier } from "@/lib/user-language";

/** Map finding sample notes to user-facing confidence tiers. */
export function findingConfidenceTier(finding: Finding): ConfidenceTier {
  const gameCounts = finding.stats
    .map((stat) => stat.detail?.match(/(\d+)\s+games/i)?.[1])
    .filter(Boolean)
    .map((n) => parseInt(n!, 10));
  const noteNumbers = finding.sampleNote.match(/\d[\d,]*/g);
  const noteLargest =
    noteNumbers
      ?.map((n) => parseInt(n.replace(/,/g, ""), 10))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => b - a)[0] ?? 0;
  const largest = Math.max(noteLargest, ...gameCounts, 0);

  if (largest >= 100) return "Strong";
  if (largest >= 30) return "Moderate";
  return "Thin";
}

export const FINDING_CATEGORY_LABELS: Record<FindingCategory, string> = {
  "league-trend": "League trend",
  "ref-outlier": "Ref outlier",
  "team-crew": "Team crew",
  "whistle-extreme": "Whistle extreme",
  "scoring-extreme": "Scoring extreme",
  "ats-edge": "ATS historical tendency",
  "ou-edge": "O/U historical tendency",
  "ref-team-split": "Ref–team split",
};

export type FindingFilterGroup =
  | "all"
  | "ref-outliers"
  | "team-trends"
  | "ats-edges"
  | "over-under";

export const FINDING_FILTER_GROUPS: FindingFilterGroup[] = [
  "all",
  "ref-outliers",
  "team-trends",
  "ats-edges",
  "over-under",
];

export const FINDING_FILTER_LABELS: Record<FindingFilterGroup, string> = {
  all: "All",
  "ref-outliers": "Ref Outliers",
  "team-trends": "Team Trends",
  "ats-edges": "ATS tendencies",
  "over-under": "Over/Under",
};

export const FINDING_CATEGORY_TO_FILTER: Record<
  FindingCategory,
  Exclude<FindingFilterGroup, "all">
> = {
  "league-trend": "team-trends",
  "ref-outlier": "ref-outliers",
  "team-crew": "team-trends",
  "whistle-extreme": "ref-outliers",
  "scoring-extreme": "ref-outliers",
  "ats-edge": "ats-edges",
  "ou-edge": "over-under",
  "ref-team-split": "team-trends",
};

export function findingMatchesFilter(
  category: FindingCategory,
  filter: FindingFilterGroup,
): boolean {
  if (filter === "all") return true;
  return FINDING_CATEGORY_TO_FILTER[category] === filter;
}

export type FindingLeague = "NBA" | "NHL" | "NFL" | "NFL";

/** Infer league from finding id and profile links (NHL ids and /nhl/* hrefs). */
export function inferFindingLeague(finding: Finding): FindingLeague {
  if (finding.id.startsWith("nhl-")) return "NHL";
  if (finding.links.some((link) => link.href.startsWith("/nhl"))) return "NHL";
  return "NBA";
}

export function filterFindingsByLeague<T extends Finding>(
  findings: T[],
  league: FindingLeague,
): T[] {
  return findings.filter((finding) => inferFindingLeague(finding) === league);
}

export function researchHubHref(league: FindingLeague): string {
  return league === "NHL" ? "/nhl/research" : "/research";
}

export function researchFindingHref(
  finding: Pick<Finding, "id"> | string,
  league?: FindingLeague,
): string {
  const id = typeof finding === "string" ? finding : finding.id;
  const resolvedLeague =
    league ??
    (id.startsWith("nhl-") ? "NHL" : ("NBA" satisfies FindingLeague));
  return resolvedLeague === "NHL"
    ? `/nhl/research/${id}`
    : `/research/${id}`;
}

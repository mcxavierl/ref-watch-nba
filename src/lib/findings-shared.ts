import { formatFindingSampleMeta } from "@/lib/finding-copy";
import { sanitizeUserFacingCopy } from "@/lib/user-language";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export interface RefTeamScoringExtreme {
  ref: RefProfile;
  team: string;
  avgTotal: number;
  games: number;
}

/** Global hottest ref–team pair, then coldest from a different ref. */
export function collectRefTeamScoringExtremes(
  stats: RefStatsFile,
  minTeamGames: number,
): { hottest: RefTeamScoringExtreme; coldest: RefTeamScoringExtreme } | null {
  let hottest: RefTeamScoringExtreme | undefined;

  for (const ref of stats.refs) {
    if (!ref.teamStats) continue;
    for (const [team, st] of Object.entries(ref.teamStats)) {
      if (st.games < minTeamGames) continue;
      if (!hottest || st.avgTotalPoints > hottest.avgTotal) {
        hottest = { ref, team, avgTotal: st.avgTotalPoints, games: st.games };
      }
    }
  }

  if (!hottest) return null;

  let coldest: RefTeamScoringExtreme | undefined;
  for (const ref of stats.refs) {
    if (ref.slug === hottest.ref.slug || !ref.teamStats) continue;
    for (const [team, st] of Object.entries(ref.teamStats)) {
      if (st.games < minTeamGames) continue;
      if (!coldest || st.avgTotalPoints < coldest.avgTotal) {
        coldest = { ref, team, avgTotal: st.avgTotalPoints, games: st.games };
      }
    }
  }

  if (!coldest) return null;
  return { hottest, coldest };
}

export type FindingCategory =
  | "league-trend"
  | "ref-outlier"
  | "team-crew"
  | "whistle-extreme"
  | "scoring-extreme"
  | "ats-edge"
  | "ou-edge"
  | "ref-team-split"
  | "marquee-efficiency"
  | "coach-friction"
  | "player-friction";

export interface FindingLink {
  label: string;
  href: string;
}

export interface FindingStat {
  label: string;
  value: string;
  detail?: string;
}

/** Baseline explainer when a finding builder omits one. */
export const DEFAULT_FINDING_EXPLAINER =
  "Pattern surfaced from historical game logs in this dataset. Descriptive context only, not a betting signal or prediction.";

export function resolveFindingExplainer(explainer?: string): string {
  const trimmed = explainer?.trim();
  if (!trimmed || trimmed.length === 0) return DEFAULT_FINDING_EXPLAINER;
  return sanitizeUserFacingCopy(trimmed);
}

const SAMPLE_STAT_LABEL = /^sample$/i;

/** True when a stat cell is only sample-size metadata (not a substantive metric). */
export function isSampleOnlyStat(stat: FindingStat): boolean {
  return SAMPLE_STAT_LABEL.test(stat.label.trim());
}

/** Parse game count from stat detail lines like "8 marquee games" or "0 non-marquee games". */
export function parseSampleGamesFromStatDetail(detail?: string): number | null {
  if (!detail) return null;
  const match = detail.match(
    /(\d+)\s+(?:marquee games|non-marquee games|non-marquee baseline|games)\b/i,
  );
  return match ? parseInt(match[1]!, 10) : null;
}

/** Hide comparison stats when either arm has zero games (no actionable split). */
export function isActionableComparisonStat(stat: FindingStat): boolean {
  const games = parseSampleGamesFromStatDetail(stat.detail);
  if (games === 0) return false;

  const label = stat.label.trim().toLowerCase();
  if (label.includes("baseline") && games === null) {
    const zeroValue = /^0(?:\.0+)?%?$/.test(stat.value.trim());
    if (zeroValue && stat.detail?.includes("0 non-marquee")) return false;
  }

  return true;
}

/** Drop sample-only cells so the metrics grid stays at two substantive columns. */
export function filterDisplayStats(stats: FindingStat[]): FindingStat[] {
  const filtered = stats.filter(
    (stat) => !isSampleOnlyStat(stat) && isActionableComparisonStat(stat),
  );
  return filtered.length > 0 ? filtered : stats.filter((stat) => !isSampleOnlyStat(stat));
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
  /** Objective birthplace context when high-confidence + extreme delta gates pass. */
  regionalContext?: string;
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

export const CONFIDENCE_TIER_RANK: Record<ConfidenceTier, number> = {
  Strong: 0,
  Moderate: 1,
  Thin: 2,
};

export function findingLargestSample(finding: Finding): number {
  const gameCounts = finding.stats
    .map((stat) => stat.detail?.match(/(\d+)\s+games/i)?.[1])
    .flatMap((match) => (match ? [parseInt(match, 10)] : []));
  const directGameStats = finding.stats
    .filter((stat) => /^games$/i.test(stat.label.trim()))
    .map((stat) => parseInt(stat.value.replace(/,/g, ""), 10))
    .filter((n) => Number.isFinite(n));
  const noteNumbers = finding.sampleNote.match(/\d[\d,]*/g);
  const noteLargest =
    noteNumbers
      ?.map((n) => parseInt(n.replace(/,/g, ""), 10))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => b - a)[0] ?? 0;
  return Math.max(noteLargest, ...gameCounts, ...directGameStats, 0);
}

const EFFECT_SIZE_STAT_LABEL =
  /delta|edge|swing|variance|spread|lean|skew|lift|gap|vs baseline|vs league/i;

function parseNumericMagnitude(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const pctMatch = trimmed.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) {
    const parsed = Number.parseFloat(pctMatch[1]!);
    return Number.isFinite(parsed) ? Math.abs(parsed) / 100 : null;
  }
  const ppMatch = trimmed.match(/([+-]?\d+(?:\.\d+)?)\s*pp\b/i);
  if (ppMatch) {
    const parsed = Number.parseFloat(ppMatch[1]!);
    return Number.isFinite(parsed) ? Math.abs(parsed) / 100 : null;
  }
  const numeric = Number.parseFloat(trimmed.replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(numeric) ? Math.abs(numeric) : null;
}

/** Infer an effect-size proxy from finding stats when the builder score is stripped. */
export function inferFindingEffectSize(finding: Finding): number {
  let max = 0;

  for (const stat of finding.stats) {
    const magnitude = parseNumericMagnitude(stat.value);
    if (magnitude === null) continue;
    const label = stat.label.toLowerCase();
    const normalized =
      label.includes("edge") || label.includes("delta") || label.includes("lean")
        ? magnitude
        : magnitude > 1 && !label.includes("per game")
          ? magnitude / 100
          : magnitude;
    if (EFFECT_SIZE_STAT_LABEL.test(stat.label) || label.includes("edge")) {
      max = Math.max(max, normalized);
    }
  }

  if (max > 0) return max;

  const headlineMatch = finding.headline.match(/([+-]?\d+(?:\.\d+)?)\s*(?:pp|%)/i);
  if (headlineMatch) {
    const parsed = Number.parseFloat(headlineMatch[1]!);
    if (Number.isFinite(parsed)) {
      return Math.abs(parsed) / 100;
    }
  }

  return 0.05;
}

/** Rank stripped findings by inferred effect size and sample depth. */
export function findingImpactScore(
  finding: Finding,
  sampleGames?: number,
): number {
  const games =
    sampleGames !== undefined && sampleGames > 0
      ? sampleGames
      : findingLargestSample(finding);
  return rankScore(inferFindingEffectSize(finding), games, 30);
}

/** Map finding sample notes to user-facing confidence tiers. */
export function findingConfidenceTier(
  finding: Finding,
  sampleGames?: number,
): ConfidenceTier {
  const largest =
    sampleGames !== undefined && sampleGames > 0
      ? sampleGames
      : findingLargestSample(finding);

  if (largest >= 100) return "Strong";
  if (largest >= 30) return "Moderate";
  return "Thin";
}

export function sortFindingsByStrength<T extends Finding>(
  findings: T[],
  sampleGamesById?: Map<string, number>,
): T[] {
  return [...findings].sort((a, b) => {
    const sampleA = sampleGamesById?.get(a.id);
    const sampleB = sampleGamesById?.get(b.id);
    const tierA =
      CONFIDENCE_TIER_RANK[findingConfidenceTier(a, sampleA)];
    const tierB =
      CONFIDENCE_TIER_RANK[findingConfidenceTier(b, sampleB)];
    if (tierA !== tierB) return tierA - tierB;
    return findingImpactScore(b, sampleB) - findingImpactScore(a, sampleA);
  });
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
  "marquee-efficiency": "Marquee efficiency",
  "coach-friction": "Coach Friction",
  "player-friction": "Player Friction",
};

export type FindingFilterGroup =
  | "all"
  | "ref-outliers"
  | "team-trends"
  | "ats-edges"
  | "over-under"
  | "marquee"
  | "friction";

export const FINDING_FILTER_GROUPS: FindingFilterGroup[] = [
  "all",
  "ref-outliers",
  "team-trends",
  "ats-edges",
  "over-under",
  "marquee",
  "friction",
];

export const FINDING_FILTER_LABELS: Record<FindingFilterGroup, string> = {
  all: "All",
  "ref-outliers": "Ref Outliers",
  "team-trends": "Team Trends",
  "ats-edges": "ATS tendencies",
  "over-under": "Over/Under",
  marquee: "Marquee / Prime-Time",
  friction: "Friction / Grudge",
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
  "marquee-efficiency": "marquee",
  "coach-friction": "friction",
  "player-friction": "friction",
};

export function findingMatchesFilter(
  category: FindingCategory,
  filter: FindingFilterGroup,
): boolean {
  if (filter === "all") return true;
  return FINDING_CATEGORY_TO_FILTER[category] === filter;
}

export type FindingLeague = "NBA" | "NHL" | "WNBA" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";

/** Infer league from finding id and profile links. */
export function inferFindingLeague(finding: Finding): FindingLeague {
  if (finding.id.startsWith("wnba-")) return "WNBA";
  if (finding.id.startsWith("laliga-")) return "LALIGA";
  if (finding.id.startsWith("epl-")) return "EPL";
  if (finding.id.startsWith("cfb-")) return "CFB";
  if (finding.id.startsWith("cbb-")) return "CBB";
  if (finding.id.startsWith("nfl-")) return "NFL";
  if (finding.id.startsWith("nhl-")) return "NHL";
  if (finding.links?.some((link) => link.href.startsWith("/wnba"))) return "WNBA";
  if (finding.links?.some((link) => link.href.startsWith("/laliga"))) return "LALIGA";
  if (finding.links?.some((link) => link.href.startsWith("/epl"))) return "EPL";
  if (finding.links?.some((link) => link.href.startsWith("/cfb"))) return "CFB";
  if (finding.links?.some((link) => link.href.startsWith("/cbb"))) return "CBB";
  if (finding.links?.some((link) => link.href.startsWith("/nfl"))) return "NFL";
  if (finding.links?.some((link) => link.href.startsWith("/nhl"))) return "NHL";
  return "NBA";
}

export function filterFindingsByLeague<T extends Finding>(
  findings: T[],
  league: FindingLeague,
): T[] {
  return findings.filter((finding) => inferFindingLeague(finding) === league);
}

export function researchHubHref(league: FindingLeague): string {
  if (league === "WNBA") return "/wnba/research";
  if (league === "NHL") return "/nhl/research";
  if (league === "NFL") return "/nfl/research";
  if (league === "CBB") return "/cbb/research";
  if (league === "CFB") return "/cfb/research";
  if (league === "LALIGA") return "/laliga/research";
  if (league === "EPL") return "/epl/research";
  return "/research";
}

export function researchFindingHref(
  finding: Pick<Finding, "id"> | string,
  league?: FindingLeague,
): string {
  const id = typeof finding === "string" ? finding : finding.id;
  const resolvedLeague =
    league ??
    (id.startsWith("wnba-")
      ? "WNBA"
      : id.startsWith("laliga-")
      ? "LALIGA"
      : id.startsWith("epl-")
      ? "EPL"
      : id.startsWith("cfb-")
        ? "CFB"
        : id.startsWith("cbb-")
          ? "CBB"
          : id.startsWith("nfl-")
            ? "NFL"
            : id.startsWith("nhl-")
              ? "NHL"
              : ("NBA" satisfies FindingLeague));
  if (resolvedLeague === "WNBA") return `/wnba/research/${id}`;
  if (resolvedLeague === "NHL") return `/nhl/research/${id}`;
  if (resolvedLeague === "NFL") return `/nfl/research/${id}`;
  if (resolvedLeague === "LALIGA") return `/laliga/research/${id}`;
  if (resolvedLeague === "EPL") return `/epl/research/${id}`;
  if (resolvedLeague === "CBB") return `/cbb/research/${id}`;
  if (resolvedLeague === "CFB") return `/cfb/research/${id}`;
  return `/research/${id}`;
}

/** Research hub with optional category-group + confidence query filters. */
export function researchHubFilterHref(
  league: FindingLeague,
  opts?: {
    filter?: FindingFilterGroup;
    confidence?: ConfidenceTier;
  },
): string {
  const base = researchHubHref(league);
  const params = new URLSearchParams();
  if (opts?.filter && opts.filter !== "all") {
    params.set("filter", opts.filter);
  }
  if (opts?.confidence) {
    params.set("confidence", opts.confidence);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}


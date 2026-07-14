import { formatFindingSampleMeta } from "@/lib/finding-copy";
import {
  MIN_MARKET_EXPECTATION_GAMES,
  pickStrongestMarketAtsOutlier,
} from "@/lib/ref-market-expectation";
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

/** Drop sample-only cells so the metrics grid stays at two substantive columns. */
export function filterDisplayStats(stats: FindingStat[]): FindingStat[] {
  const filtered = stats.filter((stat) => !isSampleOnlyStat(stat));
  return filtered.length > 0 ? filtered : stats;
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

function largestSampleFromFinding(finding: Finding): number {
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
  return Math.max(noteLargest, ...gameCounts, 0);
}

/** Map finding sample notes to user-facing confidence tiers. */
export function findingConfidenceTier(
  finding: Finding,
  sampleGames?: number,
): ConfidenceTier {
  const largest =
    sampleGames !== undefined && sampleGames > 0
      ? sampleGames
      : largestSampleFromFinding(finding);

  if (largest >= 100) return "Strong";
  if (largest >= 30) return "Moderate";
  return "Thin";
}

export function sortFindingsByStrength<T extends Finding>(
  findings: T[],
  sampleGamesById?: Map<string, number>,
): T[] {
  return [...findings].sort((a, b) => {
    const tierA =
      CONFIDENCE_TIER_RANK[
        findingConfidenceTier(a, sampleGamesById?.get(a.id))
      ];
    const tierB =
      CONFIDENCE_TIER_RANK[
        findingConfidenceTier(b, sampleGamesById?.get(b.id))
      ];
    return tierA - tierB;
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

export type FindingLeague = "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";

/** Infer league from finding id and profile links. */
export function inferFindingLeague(finding: Finding): FindingLeague {
  if (finding.id.startsWith("laliga-")) return "LALIGA";
  if (finding.id.startsWith("epl-")) return "EPL";
  if (finding.id.startsWith("cfb-")) return "CFB";
  if (finding.id.startsWith("cbb-")) return "CBB";
  if (finding.id.startsWith("nfl-")) return "NFL";
  if (finding.id.startsWith("nhl-")) return "NHL";
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
    (id.startsWith("laliga-")
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

function formatCoverPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * ATS outlier from market-expectation enrichment (independent of straight-up W-L).
 * Returns null when scoped stats were not enriched or no ref clears the gate.
 */
export function buildMarketExpectationAtsFinding(
  stats: RefStatsFile,
  rankScoreFn: (
    effectSize: number,
    sampleGames: number,
    minSample: number,
  ) => number,
): ScoredFindingBase | null {
  if (!stats.meta.atsAvailable) return null;

  const pick = pickStrongestMarketAtsOutlier(stats);
  if (!pick) return null;

  const { ref, market } = pick;
  const edge = Math.abs(market.deviationFromNeutral);
  const direction =
    market.outlierDirection === "covers_more" ? "cover" : "fail to cover";
  const correlationNote =
    market.underdogCoverCorrelation !== null
      ? ` Underdog ATS correlation: ${(market.underdogCoverCorrelation * 100).toFixed(0)}% (φ).`
      : "";

  return {
    id: "ats-outlier",
    category: "ats-edge",
    headline: `${ref.name}: teams ${direction} ${formatCoverPct(market.coverRate)} ATS vs market`,
    summary: `Across ${market.linedGames} lined games, teams are ${formatCoverPct(market.coverRate)} against the spread with ${ref.name} — ${(edge * 100).toFixed(1)} pts from a neutral 50% split, independent of straight-up wins.${correlationNote}`,
    explainer:
      "Performance vs. market expectation uses closing spreads only (lineSource=external). Synthetic lines are excluded.",
    stats: [
      {
        label: "ATS cover",
        value: formatCoverPct(market.coverRate),
        detail: `${market.atsCovers}-${market.atsLosses}-${market.atsPushes}`,
      },
      {
        label: "Sample",
        value: String(market.linedGames),
        detail: `Min ${MIN_MARKET_EXPECTATION_GAMES} lined games`,
      },
      {
        label: "Deviation vs 50%",
        value: `${(edge * 100).toFixed(1)} pts`,
        detail: "Absolute ATS deviation",
      },
    ],
    sampleNote: formatFindingSampleMeta(
      market.linedGames,
      stats.meta.seasons,
    ),
    links: [{ label: ref.name, href: `/refs/${ref.slug}` }],
    score: rankScoreFn(edge, market.linedGames, MIN_MARKET_EXPECTATION_GAMES),
    sampleGames: market.linedGames,
  };
}

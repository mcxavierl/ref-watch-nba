import {
  meetsOverRateHighlightThreshold,
  meetsOverRateTopTierThreshold,
  meetsScoringHighlightThreshold,
  meetsScoringTopTierThreshold,
  meetsWhistleHighlightThreshold,
  meetsWhistleTopTierThreshold,
  type HighlightSuperlativeKind,
} from "@/lib/highlight-badge";
import { LEAGUES, type LeagueConfig, type LeagueId } from "@/lib/leagues";
import { loadLeagueStats } from "@/lib/load-league-stats";
import { filterNhlReferees } from "@/lib/nhl/officials";
import {
  buildRankingsSynthesis,
  type RankingsInsight,
  type RankingsSynthesis,
} from "@/lib/rankings-synthesis";
import { bettingAtsRate, bettingOuRate } from "@/lib/stats-utils";
import { VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/verified-live-leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";

/** Minimum betting hit rate for ATS / O/U highlight slots in rankings synthesis. */
export const HIGHLIGHT_BETTING_RATE_MIN = 0.54;

const PRIMARY_TITLE_BY_KIND: Record<HighlightSuperlativeKind, RegExp> = {
  "scoring-bump": /^Biggest scoring bump$/i,
  "scoring-dip": /^Biggest scoring dip$/i,
  "over-rate-high": /^Highest historical over-rate vs baseline$/i,
  "over-rate-low": /^Lowest historical over-rate vs baseline$/i,
  "whistle-heavy": /^Heaviest .+ ref$/i,
  "whistle-light": /^Lightest .+ ref$/i,
  "ats-strong": /^Strongest home ATS track record$/i,
  "ou-high": /^Highest O\/U hit rate vs closing total$/i,
};

function qualifiedRefs(
  stats: RefStatsFile,
  leagueId: LeagueId,
  minSample: number,
): RefProfile[] {
  const pool = leagueId === "nhl" ? filterNhlReferees(stats.refs) : stats.refs;
  return pool.filter((ref) => ref.games >= minSample);
}

function whistleDelta(ref: RefProfile, leagueId: LeagueId): number {
  if (leagueId === "nhl") {
    return ref.nhlAnalytics?.minorsDelta ?? ref.foulsDelta;
  }
  if (leagueId === "nfl") {
    return ref.nflAnalytics?.flagsDelta ?? ref.foulsDelta;
  }
  return ref.foulsDelta;
}

function primaryKindForTitle(title: string): HighlightSuperlativeKind | null {
  for (const [kind, pattern] of Object.entries(PRIMARY_TITLE_BY_KIND) as Array<
    [HighlightSuperlativeKind, RegExp]
  >) {
    if (pattern.test(title.trim())) return kind;
  }
  return null;
}

function verifyInsightMateriality(
  insight: RankingsInsight,
  ref: RefProfile,
  league: LeagueConfig,
  stats: RefStatsFile,
): string | null {
  const leagueId = league.id;

  if (insight.id === "sample-depth") {
    return null;
  }

  if (
    insight.id === "top-scoring" ||
    insight.id === "bottom-scoring" ||
    insight.id === "scoring-depth"
  ) {
    if (!meetsScoringHighlightThreshold(ref.totalPointsDelta)) {
      return `${insight.refSlug}: scoring highlight below ${leagueId} ΔPTS gate`;
    }
    const primaryKind = primaryKindForTitle(insight.title);
    if (
      primaryKind === "scoring-bump" ||
      primaryKind === "scoring-dip"
    ) {
      if (!meetsScoringTopTierThreshold(ref.totalPointsDelta)) {
        return `${insight.refSlug}: primary scoring badge below top-tier ΔPTS gate`;
      }
    }
    return null;
  }

  if (
    insight.id === "top-over" ||
    insight.id === "top-under" ||
    insight.id === "over-depth"
  ) {
    if (!meetsOverRateHighlightThreshold(ref.overRate)) {
      return `${insight.refSlug}: over-rate highlight below gate`;
    }
    const primaryKind = primaryKindForTitle(insight.title);
    if (primaryKind === "over-rate-high" || primaryKind === "over-rate-low") {
      if (!meetsOverRateTopTierThreshold(ref.overRate)) {
        return `${insight.refSlug}: primary over-rate badge below top-tier gate`;
      }
    }
    return null;
  }

  if (
    insight.id === "top-whistle" ||
    insight.id === "light-whistle" ||
    insight.id === "whistle-depth"
  ) {
    const delta = whistleDelta(ref, leagueId);
    if (!meetsWhistleHighlightThreshold(delta, leagueId)) {
      return `${insight.refSlug}: whistle highlight below gate`;
    }
    const primaryKind = primaryKindForTitle(insight.title);
    if (primaryKind === "whistle-heavy" || primaryKind === "whistle-light") {
      if (!meetsWhistleTopTierThreshold(delta, leagueId)) {
        return `${insight.refSlug}: primary whistle badge below top-tier gate`;
      }
    }
    return null;
  }

  if (insight.id === "top-ats") {
    const rate = bettingAtsRate(ref.bettingStats);
    if (rate === null || rate < HIGHLIGHT_BETTING_RATE_MIN) {
      return `${insight.refSlug}: ATS highlight below betting gate`;
    }
    return null;
  }

  if (insight.id === "top-ou-betting") {
    const rate = bettingOuRate(ref.bettingStats);
    if (rate === null || rate < HIGHLIGHT_BETTING_RATE_MIN) {
      return `${insight.refSlug}: O/U highlight below betting gate`;
    }
    return null;
  }

  return null;
}

/** Audit one rankings highlight grid for materiality gates and unique primaries. */
export function auditRankingsHighlightGrid(
  synthesis: RankingsSynthesis,
  stats: RefStatsFile,
  league: LeagueConfig,
): string[] {
  const failures: string[] = [];
  const refsBySlug = new Map(
    qualifiedRefs(stats, league.id, stats.meta.minSampleSize).map((ref) => [
      ref.slug,
      ref,
    ]),
  );
  const primaryCounts = new Map<HighlightSuperlativeKind, number>();

  for (const insight of synthesis.insights) {
    const primaryKind = primaryKindForTitle(insight.title);
    if (primaryKind) {
      primaryCounts.set(primaryKind, (primaryCounts.get(primaryKind) ?? 0) + 1);
    }

    if (!insight.refSlug) continue;
    const ref = refsBySlug.get(insight.refSlug);
    if (!ref) {
      failures.push(`${league.id}: insight ${insight.id} references missing ref ${insight.refSlug}`);
      continue;
    }

    const materialityFailure = verifyInsightMateriality(insight, ref, league, stats);
    if (materialityFailure) {
      failures.push(`${league.id}: ${materialityFailure}`);
    }
  }

  for (const [kind, count] of primaryCounts) {
    if (count > 1) {
      failures.push(
        `${league.id}: duplicate primary superlative "${kind}" (${count} cards)`,
      );
    }
  }

  const slugs = synthesis.insights
    .map((insight) => insight.refSlug)
    .filter((slug): slug is string => Boolean(slug));
  if (new Set(slugs).size !== slugs.length) {
    failures.push(`${league.id}: duplicate officials across highlight grid`);
  }

  return failures;
}

export type HighlightIntegrityAuditResult = {
  leagueId: LeagueId;
  insightCount: number;
  failures: string[];
};

/** Run highlight integrity checks for every verified live league with qualified refs. */
export function auditHighlightIntegrityForLiveLeagues(): HighlightIntegrityAuditResult[] {
  return VERIFIED_LIVE_LEAGUE_IDS.map((leagueId) => {
    const league = LEAGUES[leagueId];
    const { stats } = loadLeagueStats(leagueId);
    const qualified = qualifiedRefs(stats, leagueId, stats.meta.minSampleSize);

    if (qualified.length === 0) {
      return { leagueId, insightCount: 0, failures: [] };
    }

    const synthesis = buildRankingsSynthesis(stats, league);
    const failures = auditRankingsHighlightGrid(synthesis, stats, league);
    return {
      leagueId,
      insightCount: synthesis.insights.length,
      failures,
    };
  });
}

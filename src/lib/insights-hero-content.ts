import type { Finding } from "@/lib/findings-shared";
import type { RefRankingSort } from "@/lib/rankings";
import {
  buildRankingsSynthesis,
  MAX_RANKINGS_HIGHLIGHT_CARDS,
  type RankingsInsight,
  type RankingsSynthesis,
} from "@/lib/rankings-synthesis";
import type { LeagueConfig } from "@/lib/leagues";
import { gsniInsightSummary, gsniShrinkageFromProfile } from "@/lib/gsni-display";
import {
  compareGsniByAbsDesc,
  gsniOfficialRowAnchor,
  gsniQualifiesHighVariance,
  GSNI_ANOMALY_HIGHLIGHT_MAX,
} from "@/lib/gsni-research";
import { formatGsniScoreValue } from "@/lib/gsni-ui";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export type InsightsHubView = "tendencies" | "trends" | "findings" | "game-state";

export const INSIGHTS_RANKINGS_PREVIEW_LIMIT = 5;

const TRENDS_INSIGHT_IDS = new Set([
  "top-scoring",
  "bottom-scoring",
  "top-over",
  "top-under",
  "top-whistle",
  "light-whistle",
  "scoring-depth",
  "over-depth",
  "whistle-depth",
]);

export function refSlugFromHref(href: string): string | undefined {
  const match = href.match(/\/refs\/([^/?#]+)/);
  return match?.[1];
}

export function refSlugsFromFindings(findings: Finding[]): string[] {
  const slugs = new Set<string>();
  for (const finding of findings) {
    for (const link of finding.links) {
      const slug = refSlugFromHref(link.href);
      if (slug) slugs.add(slug);
    }
  }
  return [...slugs];
}

export function findingsToRankingsInsights(
  findings: Finding[],
  limit = MAX_RANKINGS_HIGHLIGHT_CARDS,
): RankingsInsight[] {
  return findings.slice(0, limit).map((finding) => {
    const primaryLink = finding.links[0];
    const primaryStat = finding.stats.find((stat) => stat.value.trim().length > 0);
    return {
      id: finding.category,
      title: finding.headline,
      body: finding.summary,
      refSlug: primaryLink ? refSlugFromHref(primaryLink.href) : undefined,
      refName: primaryLink?.label,
      statLabel: primaryStat?.label,
      statValue: primaryStat?.value,
    };
  });
}

export function filterSynthesisForTrends(
  synthesis: RankingsSynthesis,
): RankingsSynthesis {
  const insights = synthesis.insights.filter((insight) =>
    TRENDS_INSIGHT_IDS.has(insight.id),
  );
  return {
    ...synthesis,
    insights:
      insights.length > 0
        ? insights.slice(0, MAX_RANKINGS_HIGHLIGHT_CARDS)
        : synthesis.insights.slice(0, MAX_RANKINGS_HIGHLIGHT_CARDS),
  };
}

export function gsniSortedRefs(refs: RefProfile[]): RefProfile[] {
  return refs
    .filter((ref) => {
      const display =
        gsniShrinkageFromProfile(ref)?.display ?? ref.referee_gsni;
      return (
        display !== undefined &&
        Number.isFinite(display) &&
        (ref.gsniHighLeverageMinutes ?? 0) > 0
      );
    })
    .sort((a, b) => {
      const aDisplay =
        gsniShrinkageFromProfile(a)?.display ?? a.referee_gsni ?? null;
      const bDisplay =
        gsniShrinkageFromProfile(b)?.display ?? b.referee_gsni ?? null;
      return compareGsniByAbsDesc(aDisplay, bDisplay);
    });
}

export type InsightsRankingsConfig = {
  defaultSort: RefRankingSort;
  filterSlugs?: Set<string>;
  preserveOrder?: boolean;
  refs?: RefProfile[];
};

export function rankingsConfigForView(
  view: InsightsHubView,
  options: {
    refs: RefProfile[];
    synthesis: RankingsSynthesis;
    findings: Finding[];
  },
): InsightsRankingsConfig {
  switch (view) {
    case "trends":
      return { defaultSort: "overRate-desc" };
    case "findings": {
      const slugs = refSlugsFromFindings(options.findings);
      return {
        defaultSort: "scoring-desc",
        filterSlugs: slugs.length > 0 ? new Set(slugs) : undefined,
      };
    }
    case "game-state": {
      const gsniRefs = gsniSortedRefs(options.refs);
      return {
        defaultSort: "scoring-desc",
        preserveOrder: true,
        refs: gsniRefs,
      };
    }
    default:
      return { defaultSort: "scoring-desc" };
  }
}

export function heroSynthesisForView(
  view: InsightsHubView,
  stats: RefStatsFile,
  league: LeagueConfig,
  findings: Finding[],
): RankingsSynthesis {
  const base = buildRankingsSynthesis(stats, league);

  if (view === "findings" && findings.length > 0) {
    return {
      ...base,
      headline: "Top highlights",
      subhead: "",
      insights: findingsToRankingsInsights(findings),
      leagueSummary: "",
    };
  }

  if (view === "trends") {
    return filterSynthesisForTrends(base);
  }

  if (view === "game-state") {
    const gsniRefs = gsniSortedRefs(stats.refs)
      .filter((ref) => {
        const displayScore =
          gsniShrinkageFromProfile(ref)?.display ?? ref.referee_gsni;
        return (
          displayScore !== undefined && gsniQualifiesHighVariance(displayScore)
        );
      })
      .slice(0, GSNI_ANOMALY_HIGHLIGHT_MAX);
    return {
      ...base,
      headline: "Top highlights",
      subhead: "Extreme high-leverage frequency anomalies only.",
      insights: gsniRefs.map((ref) => {
        const displayScore =
          gsniShrinkageFromProfile(ref)?.display ?? ref.referee_gsni!;
        return {
          id: `gsni-highlight-${ref.slug}`,
          title: "Extreme anomaly",
          body: gsniInsightSummary(displayScore),
          refSlug: ref.slug,
          refName: ref.name,
          statLabel: "Game-State Index",
          statValue: formatGsniScoreValue(displayScore),
          categoryHref: `${league.pathPrefix}/research/game-state#${gsniOfficialRowAnchor(ref.slug)}`,
        };
      }),
      leagueSummary: "",
    };
  }

  return base;
}

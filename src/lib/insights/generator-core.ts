import { insightsViewHref } from "@/lib/insights-routes";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { PRO_VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";
import {
  computeMatrixExtremes,
  formatMatrixHighlightBaseline,
  type MatrixExtremeHighlight,
} from "@/lib/ref-team-matrix";
import { computeRefTeamMatrix } from "@/lib/ref-team-matrix-compute";
import { insightDrilldownId } from "@/lib/insight-drilldown-types";
import { formatBaselinePct, formatPct, formatSigned } from "@/lib/stats-utils";
import { sportCopy } from "@/lib/user-language";
import type { LeagueInsightCard, LeagueInsightTone } from "@/lib/league-overview-insights";
import { EVERGREEN_TOP_STORIES } from "@/lib/insights/evergreen";
import { applyClinicalTone } from "@/lib/insights/tone-filter";
import {
  slimLeagueStatsToRefStatsFile,
  slimRefToWhistleRef,
  type SlimLeagueStats,
  type SlimRefProfile,
} from "@/lib/insights/insight-input-slim";
import type { LeagueCardBuildSetup } from "@/lib/insights/league-card-from-stats";
import type { RefProfile, RefStatsFile, TeamCrewSplit } from "@/lib/types";
import type { InternationalMatchupHighlight } from "@/lib/insights/international-matchups";
import {
  internationalOriginHeadline,
  internationalOriginStory,
} from "@/lib/insights/international-matchups";

import {
  heroToneFromWhistlePct,
  heroToneFromWinRateDelta,
  WIN_RATE_OUTLIER_PP,
} from "@/lib/metric-significance";

export const TOP_STORY_LIMIT = 3;
export { WIN_RATE_OUTLIER_PP };
export const FOUL_RATE_VARIANCE_PCT = 10;
export const MIN_MATRIX_GAMES = 8;
export const MIN_WHISTLE_REF_GAMES = 50;

export type TopStoriesStatus = "generated" | "fallback";

export type InsightOutlierKind = "win-rate" | "whistle-pace" | "international-origin";

export type InsightOutlierCandidate = {
  leagueId: (typeof PRO_VERIFIED_LIVE_LEAGUE_IDS)[number];
  kind: InsightOutlierKind;
  significance: number;
  refSlug: string;
  refName: string;
  teamAbbr?: string;
  teamLabel?: string;
  matrix?: MatrixExtremeHighlight;
  ref?: RefProfile;
  whistleVariancePct?: number;
  /** International referee-origin vs team-origin edge. */
  internationalHighlight?: InternationalMatchupHighlight;
  originVariance?: number;
  refNation?: string;
  teamNation?: string;
  confederation?: string;
};

export type OverviewInsightsPayload = {
  generatedAt: string;
  cards: LeagueInsightCard[];
  topStories: LeagueInsightCard[];
  topStoriesStatus: TopStoriesStatus;
};

export type LeagueGeneratorSetup = LeagueCardBuildSetup & {
  leagueId: (typeof PRO_VERIFIED_LIVE_LEAGUE_IDS)[number];
};

function leaguePrefix(leagueId: LeagueId): string {
  return LEAGUES[leagueId].pathPrefix;
}

function refHref(leagueId: LeagueId, slug: string): string {
  return `${leaguePrefix(leagueId)}/refs/${slug}`;
}

function matrixHref(leagueId: LeagueId): string {
  return `${leaguePrefix(leagueId)}/matrix`;
}

function trendsHref(leagueId: (typeof PRO_VERIFIED_LIVE_LEAGUE_IDS)[number]): string {
  return insightsViewHref(leagueId, "trends");
}

function formatDeltaPts(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}pp`;
}

function heroToneFromDelta(delta: number): LeagueInsightTone {
  return heroToneFromWinRateDelta(delta);
}

function whistleVariancePct(ref: Pick<SlimRefProfile, "foulsDelta">, stats: RefStatsFile): number {
  const baseline = Math.max(stats.meta.leagueAvgFouls, 0.01);
  return (Math.abs(ref.foulsDelta) / baseline) * 100;
}

export function scanLeagueOutliersFromSlim(
  slim: SlimLeagueStats,
  setup: LeagueGeneratorSetup,
): InsightOutlierCandidate[] {
  const stats = slimLeagueStatsToRefStatsFile(slim);
  const leagueId = setup.leagueId;
  if (stats.refs.length === 0) return [];

  const candidates: InsightOutlierCandidate[] = [];

  const matrix = computeRefTeamMatrix(
    stats,
    setup.teams,
    setup.getTeamSplits,
    MIN_MATRIX_GAMES,
    { league: setup.matrixLeague },
  );

  for (const highlight of computeMatrixExtremes(matrix, 12)) {
    if (highlight.games < MIN_MATRIX_GAMES) continue;
    if (Math.abs(highlight.deltaPts) < WIN_RATE_OUTLIER_PP) continue;
    candidates.push({
      leagueId,
      kind: "win-rate",
      significance: Math.abs(highlight.deltaPts) * Math.log10(highlight.games + 1),
      refSlug: highlight.refSlug,
      refName: highlight.refName,
      teamAbbr: highlight.teamAbbr,
      teamLabel: highlight.teamLabel,
      matrix: highlight,
    });
  }

  for (const ref of slim.refs) {
    if (ref.games < MIN_WHISTLE_REF_GAMES) continue;
    const variancePct = whistleVariancePct(ref, stats);
    if (variancePct < FOUL_RATE_VARIANCE_PCT) continue;
    candidates.push({
      leagueId,
      kind: "whistle-pace",
      significance: variancePct * Math.log10(ref.games + 1),
      refSlug: ref.slug,
      refName: ref.name,
      ref: slimRefToWhistleRef(ref),
      whistleVariancePct: variancePct,
    });
  }

  return candidates;
}

function winRateHeadline(
  candidate: InsightOutlierCandidate,
  leagueLabel: string,
): string {
  const highlight = candidate.matrix!;
  const pct = Math.abs(highlight.deltaPts).toFixed(1);
  const direction = highlight.deltaPts > 0 ? "above" : "below";
  return applyClinicalTone(
    `${highlight.refName} is showing a ${pct}% win-rate outlier ${direction} the ${highlight.teamLabel} baseline in ${leagueLabel} games`,
  );
}

function whistleHeadline(
  candidate: InsightOutlierCandidate,
  leagueLabel: string,
  whistleUnit: string,
): string {
  const ref = candidate.ref!;
  const variance = candidate.whistleVariancePct!.toFixed(1);
  const direction = ref.foulsDelta > 0 ? "above" : "below";
  return applyClinicalTone(
    `${ref.name} is pacing ${variance}% ${direction} league average for ${whistleUnit} in ${leagueLabel}`,
  );
}

export function candidateToInsightCard(candidate: InsightOutlierCandidate): LeagueInsightCard {
  const config = LEAGUES[candidate.leagueId];
  const copy = sportCopy(candidate.leagueId);

  if (candidate.kind === "win-rate" && candidate.matrix) {
    const highlight = candidate.matrix;
    const splitPct = formatPct(highlight.winRate);
    const baselinePct = formatBaselinePct(
      highlight.baselineGames,
      highlight.baselineWinRate,
    );
    const deltaLabel = formatDeltaPts(highlight.deltaPts);

    return {
      leagueId: candidate.leagueId,
      label: config.label,
      shortLabel: config.shortLabel,
      kind: "matrix-edge",
      kicker: "Statistically significant ref×team split",
      headline: winRateHeadline(candidate, config.shortLabel),
      story: applyClinicalTone(
        `${highlight.wins}-${highlight.losses} (${splitPct}) across ${highlight.games} games. Team sample without this official: ${baselinePct} (${formatMatrixHighlightBaseline(highlight)}).`,
      ),
      heroValue: deltaLabel,
      heroLabel: "Win rate vs team baseline",
      heroTone: heroToneFromDelta(highlight.deltaPts),
      stats: [
        { label: "Ref×team record", value: `${highlight.wins}-${highlight.losses}` },
        { label: "Games", value: String(highlight.games) },
        { label: "Team baseline", value: baselinePct },
      ],
      links: [
        { label: "Open matrix", href: matrixHref(candidate.leagueId) },
        { label: "Ref profile", href: refHref(candidate.leagueId, highlight.refSlug) },
        { label: "League trends", href: trendsHref(candidate.leagueId) },
      ],
      entityName: highlight.refName,
      entityHref: refHref(candidate.leagueId, highlight.refSlug),
      teamLabel: highlight.teamLabel,
      refSlug: highlight.refSlug,
      teamAbbr: highlight.teamAbbr,
      drilldownId: insightDrilldownId(
        candidate.leagueId,
        highlight.refSlug,
        highlight.teamAbbr,
      ),
    };
  }

  if (candidate.kind === "international-origin" && candidate.internationalHighlight) {
    const highlight = candidate.internationalHighlight;
    const varianceLabel = formatPct(highlight.originDistance);

    return {
      leagueId: candidate.leagueId,
      label: config.label,
      shortLabel: config.shortLabel,
      kind: "league-pattern",
      kicker: "Referee-origin vs team-origin",
      headline: internationalOriginHeadline(candidate, config.shortLabel),
      story: internationalOriginStory(candidate),
      heroValue: varianceLabel,
      heroLabel: "Origin variance score",
      heroTone: highlight.originDistance >= 0.75 ? "positive" : "neutral",
      stats: [
        { label: "Ref nation", value: highlight.refNation },
        { label: "Team nation", value: highlight.teamNation },
        { label: "Games", value: String(highlight.games) },
      ],
      links: [
        { label: "Ref profile", href: refHref(candidate.leagueId, highlight.refSlug) },
        { label: `${config.shortLabel} hub`, href: leaguePrefix(candidate.leagueId) || "/" },
      ],
      entityName: highlight.refName,
      entityHref: refHref(candidate.leagueId, highlight.refSlug),
      teamLabel: highlight.teamLabel,
      refSlug: highlight.refSlug,
      teamAbbr: highlight.teamAbbr,
    };
  }

  const ref = candidate.ref!;
  const varianceLabel = `${candidate.whistleVariancePct!.toFixed(1)}%`;

  return {
    leagueId: candidate.leagueId,
    label: config.label,
    shortLabel: config.shortLabel,
    kind: "ref-outlier",
    kicker: "Whistle pace outlier",
    headline: whistleHeadline(candidate, config.shortLabel, copy.whistleUnit),
    story: applyClinicalTone(
      `${ref.name} averages ${ref.avgFouls} ${copy.whistleUnit} per game (${formatSigned(ref.foulsDelta)} vs league) across ${ref.games} verified games.`,
    ),
    heroValue: varianceLabel,
    heroLabel: `${copy.whistleUnit} variance vs league`,
    heroTone: heroToneFromWhistlePct(candidate.whistleVariancePct ?? 0),
    stats: [
      { label: `${copy.whistleUnit} per game`, value: String(ref.avgFouls) },
      { label: "Vs league avg", value: formatSigned(ref.foulsDelta) },
      { label: "Sample", value: `${ref.games} games` },
    ],
    links: [
      { label: "Ref profile", href: refHref(candidate.leagueId, ref.slug) },
      { label: "League findings", href: insightsViewHref(candidate.leagueId, "findings") },
      { label: `${config.shortLabel} hub`, href: leaguePrefix(candidate.leagueId) || "/" },
    ],
    entityName: ref.name,
    entityHref: refHref(candidate.leagueId, ref.slug),
    refSlug: ref.slug,
  };
}

export function dedupeCards(cards: LeagueInsightCard[]): LeagueInsightCard[] {
  const seen = new Set<string>();
  const out: LeagueInsightCard[] = [];
  for (const card of cards) {
    const key = `${card.leagueId}:${card.refSlug ?? card.headline}:${card.teamAbbr ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(card);
  }
  return out;
}

export function generateTopStoriesFromCandidates(
  candidates: InsightOutlierCandidate[],
  limit = TOP_STORY_LIMIT,
): { stories: LeagueInsightCard[]; status: TopStoriesStatus } {
  const sorted = [...candidates].sort((a, b) => b.significance - a.significance);
  const generated = dedupeCards(sorted.map(candidateToInsightCard)).slice(0, limit);

  if (generated.length >= limit) {
    return { stories: generated, status: "generated" };
  }

  if (generated.length > 0) {
    const filler = EVERGREEN_TOP_STORIES.filter(
      (card) => !generated.some((g) => g.leagueId === card.leagueId),
    );
    const merged = dedupeCards([...generated, ...filler]).slice(0, limit);
    return {
      stories: merged,
      status: merged.length === generated.length ? "generated" : "fallback",
    };
  }

  return {
    stories: EVERGREEN_TOP_STORIES.slice(0, limit),
    status: "fallback",
  };
}

/** Serializable cache form — omits live RefProfile objects. */
export type CachedOutlierCandidate = Omit<InsightOutlierCandidate, "ref"> & {
  refWhistle?: Pick<SlimRefProfile, "slug" | "name" | "number" | "games" | "avgFouls" | "foulsDelta" | "seasons">;
};

export function serializeOutlierCandidates(
  candidates: InsightOutlierCandidate[],
): CachedOutlierCandidate[] {
  return candidates.map(({ ref, ...rest }) => {
    if (!ref) return rest;
    return {
      ...rest,
      refWhistle: {
        slug: ref.slug,
        name: ref.name,
        number: ref.number,
        games: ref.games,
        avgFouls: ref.avgFouls,
        foulsDelta: ref.foulsDelta,
        seasons: ref.seasons,
      },
    };
  });
}

export function hydrateOutlierCandidates(
  cached: CachedOutlierCandidate[],
): InsightOutlierCandidate[] {
  return cached.map(({ refWhistle, ...rest }) => ({
    ...rest,
    ref: refWhistle ? slimRefToWhistleRef(refWhistle) : undefined,
  }));
}

export type { TeamCrewSplit };

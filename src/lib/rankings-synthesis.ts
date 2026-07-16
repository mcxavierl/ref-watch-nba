import type { LeagueConfig, LeagueId } from "@/lib/leagues";
import { LEAGUES } from "@/lib/leagues";
import { normalizeRefName } from "@/lib/bbr-ref-team-records";
import { formatScoringDeltaStat } from "@/lib/scoring-metrics";
import { filterNhlReferees } from "@/lib/nhl/officials";
import { loadLeagueStats } from "@/lib/load-league-stats";
import {
  scoringPaceRankTitle,
  thirdPersonScoringPaceBody,
  thirdPersonWhistlePaceBody,
  whistlePaceRankTitle,
} from "@/lib/finding-copy";
import { formatSigned, bettingAtsRate, bettingOuRate, formatPct } from "@/lib/stats-utils";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export type RankingsInsight = {
  id: string;
  title: string;
  body: string;
  refSlug?: string;
  refName?: string;
  statLabel?: string;
  statValue?: string;
};

export type RankingsSynthesis = {
  headline: string;
  subhead: string;
  insights: RankingsInsight[];
  leagueSummary: string;
  qualifiedCount: number;
  thinSampleCount: number;
};

export type AggregatedRankingsInsight = RankingsInsight & {
  leagueId: LeagueId;
};

export type RankingsSynthesisOptions = {
  /**
   * Normalized official names already featured on an aggregated multi-league view.
   * Prevents the same person from appearing twice when they officiate in multiple leagues.
   */
  excludeOfficialKeys?: ReadonlySet<string>;
  /** Max highlight cards for this page. Unfilled slots are omitted — refs are never repeated. */
  maxCards?: number;
};

/** Maximum highlight cards on Insights Hub / league index hero strips. */
export const MAX_RANKINGS_HIGHLIGHT_CARDS = 6;

const SCORING_ASSOCIATION_THRESHOLD = 0.3;
const OVER_RATE_HIGH_CONFIDENCE = 0.54;
const OVER_RATE_LOW_CONFIDENCE = 0.46;
const BETTING_RATE_HIGH_CONFIDENCE = 0.54;

const WHISTLE_HIGH_CONFIDENCE: Partial<Record<LeagueId, number>> = {
  nhl: 0.8,
  nfl: 2,
  cfb: 2,
};

function whistleDelta(ref: RefProfile, league: LeagueConfig): number {
  if (league.whistleFromMinors) return ref.nhlAnalytics?.minorsDelta ?? ref.foulsDelta;
  if (league.id === "nfl") return ref.nflAnalytics?.flagsDelta ?? ref.foulsDelta;
  return ref.foulsDelta;
}

function qualifiedRefs(refs: RefProfile[], minSample: number): RefProfile[] {
  return refs.filter((r) => r.games >= minSample);
}

/** Stable cross-league identity for showcase deduplication (dual-sport officials). */
export function officialShowcaseKey(ref: Pick<RefProfile, "name">): string {
  return normalizeRefName(ref.name);
}

function isAlreadyFeatured(
  ref: RefProfile,
  usedSlugs: ReadonlySet<string>,
  excludeOfficialKeys?: ReadonlySet<string>,
): boolean {
  if (usedSlugs.has(ref.slug)) return true;
  if (excludeOfficialKeys?.has(officialShowcaseKey(ref))) return true;
  return false;
}

function pickTopUniqueRef(
  sorted: RefProfile[],
  usedSlugs: ReadonlySet<string>,
  options: {
    excludeOfficialKeys?: ReadonlySet<string>;
    predicate?: (ref: RefProfile) => boolean;
    qualifies?: (ref: RefProfile) => boolean;
  },
): RefProfile | undefined {
  for (const ref of sorted) {
    if (isAlreadyFeatured(ref, usedSlugs, options.excludeOfficialKeys)) continue;
    if (options.predicate && !options.predicate(ref)) continue;
    if (options.qualifies && !options.qualifies(ref)) continue;
    return ref;
  }
  return undefined;
}

function whistleQualifies(ref: RefProfile, league: LeagueConfig): boolean {
  const threshold = WHISTLE_HIGH_CONFIDENCE[league.id] ?? 2;
  return Math.abs(whistleDelta(ref, league)) >= threshold;
}

type AnomalySlot = {
  id: string;
  enabled: (ctx: BuildContext) => boolean;
  pick: (ctx: BuildContext, usedSlugs: ReadonlySet<string>) => RefProfile | undefined;
  build: (ref: RefProfile, ctx: BuildContext) => RankingsInsight;
};

type BuildContext = {
  league: LeagueConfig;
  qualified: RefProfile[];
  baseline: number;
  unit: string;
  atsAvailable: boolean;
  byScoring: RefProfile[];
  byOver: RefProfile[];
  byWhistle: RefProfile[];
  byAts: RefProfile[];
  byOuBetting: RefProfile[];
  excludeOfficialKeys?: ReadonlySet<string>;
};

function anomalySlots(ctx: BuildContext): AnomalySlot[] {
  return [
    {
      id: "top-scoring",
      enabled: () => true,
      pick: (_ctx, usedSlugs) =>
        pickTopUniqueRef(ctx.byScoring, usedSlugs, {
          excludeOfficialKeys: ctx.excludeOfficialKeys,
          qualifies: (ref) =>
            Math.abs(ref.totalPointsDelta) >= SCORING_ASSOCIATION_THRESHOLD,
        }),
      build: (ref) => {
        const delta = ref.totalPointsDelta;
        return {
          id: "top-scoring",
          title: scoringPaceRankTitle(delta),
          body: thirdPersonScoringPaceBody(delta, ctx.unit),
          refSlug: ref.slug,
          refName: ref.name,
          statLabel: "Scoring delta vs average",
          statValue: formatScoringDeltaStat(delta, ctx.league),
        };
      },
    },
    {
      id: "top-over",
      enabled: () => true,
      pick: (_ctx, usedSlugs) =>
        pickTopUniqueRef(ctx.byOver, usedSlugs, {
          excludeOfficialKeys: ctx.excludeOfficialKeys,
          qualifies: (ref) => ref.overRate >= OVER_RATE_HIGH_CONFIDENCE,
        }),
      build: (ref) => ({
        id: "top-over",
        title: "Highest historical over-rate vs baseline",
        body: `Line benchmark is ${ctx.baseline} combined ${ctx.unit}; he clears it more often than peers in this sample.`,
        refSlug: ref.slug,
        refName: ref.name,
        statLabel: "Over rate",
        statValue: `${(ref.overRate * 100).toFixed(1)}%`,
      }),
    },
    {
      id: "top-ats",
      enabled: (c) => c.atsAvailable,
      pick: (_ctx, usedSlugs) =>
        pickTopUniqueRef(ctx.byAts, usedSlugs, {
          excludeOfficialKeys: ctx.excludeOfficialKeys,
          predicate: (ref) => bettingAtsRate(ref.bettingStats) !== null,
          qualifies: (ref) =>
            (bettingAtsRate(ref.bettingStats) ?? 0) >= BETTING_RATE_HIGH_CONFIDENCE,
        }),
      build: (ref) => ({
        id: "top-ats",
        title: "Strongest home ATS track record",
        body: `Home teams cover the spread most often in his matches. Descriptive history only, not a pick signal.`,
        refSlug: ref.slug,
        refName: ref.name,
        statLabel: "Home ATS",
        statValue: formatPct(bettingAtsRate(ref.bettingStats)!),
      }),
    },
    {
      id: "top-ou-betting",
      enabled: (c) => c.atsAvailable,
      pick: (_ctx, usedSlugs) =>
        pickTopUniqueRef(ctx.byOuBetting, usedSlugs, {
          excludeOfficialKeys: ctx.excludeOfficialKeys,
          predicate: (ref) => bettingOuRate(ref.bettingStats) !== null,
          qualifies: (ref) =>
            (bettingOuRate(ref.bettingStats) ?? 0) >= BETTING_RATE_HIGH_CONFIDENCE,
        }),
      build: (ref) => ({
        id: "top-ou-betting",
        title: "Highest O/U hit rate vs closing total",
        body: `Matches with this official most often finish over the listed total. Past tendency, not a forecast.`,
        refSlug: ref.slug,
        refName: ref.name,
        statLabel: "O/U hit %",
        statValue: formatPct(bettingOuRate(ref.bettingStats)!),
      }),
    },
    {
      id: "top-whistle",
      enabled: () => true,
      pick: (_ctx, usedSlugs) =>
        pickTopUniqueRef(ctx.byWhistle, usedSlugs, {
          excludeOfficialKeys: ctx.excludeOfficialKeys,
          qualifies: (ref) => whistleQualifies(ref, ctx.league),
        }),
      build: (ref) => {
        if (ctx.league.id === "nfl" && ref.nflAnalytics) {
          return {
            id: "top-whistle",
            title: "Most flags per match",
            body: `${ref.nflAnalytics.avgFlagsPerGame} flags/match, ${formatSigned(ref.nflAnalytics.flagsDelta)} vs league average.`,
            refSlug: ref.slug,
            refName: ref.name,
            statLabel: "Flags delta",
            statValue: formatSigned(ref.nflAnalytics.flagsDelta),
          };
        }
        const wd = whistleDelta(ref, ctx.league);
        return {
          id: "top-whistle",
          title: whistlePaceRankTitle(wd, ctx.league.metrics.whistleShort),
          body: thirdPersonWhistlePaceBody(wd, ctx.league.metrics.whistlePlain),
          refSlug: ref.slug,
          refName: ref.name,
          statLabel: `${ctx.league.metrics.whistleShort} delta vs average`,
          statValue: formatSigned(wd),
        };
      },
    },
    {
      id: "bottom-scoring",
      enabled: () => true,
      pick: (_ctx, usedSlugs) =>
        pickTopUniqueRef(
          [...ctx.qualified].sort((a, b) => a.totalPointsDelta - b.totalPointsDelta),
          usedSlugs,
          {
            excludeOfficialKeys: ctx.excludeOfficialKeys,
            qualifies: (ref) => ref.totalPointsDelta <= -SCORING_ASSOCIATION_THRESHOLD,
          },
        ),
      build: (ref) => {
        const delta = ref.totalPointsDelta;
        return {
          id: "bottom-scoring",
          title: scoringPaceRankTitle(delta),
          body: thirdPersonScoringPaceBody(delta, ctx.unit),
          refSlug: ref.slug,
          refName: ref.name,
          statLabel: "Scoring delta vs average",
          statValue: formatScoringDeltaStat(delta, ctx.league),
        };
      },
    },
    {
      id: "top-under",
      enabled: () => true,
      pick: (_ctx, usedSlugs) =>
        pickTopUniqueRef(
          [...ctx.qualified].sort((a, b) => a.overRate - b.overRate),
          usedSlugs,
          {
            excludeOfficialKeys: ctx.excludeOfficialKeys,
            qualifies: (ref) => ref.overRate <= OVER_RATE_LOW_CONFIDENCE,
          },
        ),
      build: (ref) => ({
        id: "top-under",
        title: "Lowest historical over-rate vs baseline",
        body: `Line benchmark is ${ctx.baseline} combined ${ctx.unit}; games with this official finish under the benchmark more often than peers.`,
        refSlug: ref.slug,
        refName: ref.name,
        statLabel: "Over rate",
        statValue: `${(ref.overRate * 100).toFixed(1)}%`,
      }),
    },
    {
      id: "light-whistle",
      enabled: () => true,
      pick: (_ctx, usedSlugs) =>
        pickTopUniqueRef(
          [...ctx.qualified].sort(
            (a, b) => whistleDelta(a, ctx.league) - whistleDelta(b, ctx.league),
          ),
          usedSlugs,
          {
            excludeOfficialKeys: ctx.excludeOfficialKeys,
            qualifies: (ref) => whistleQualifies(ref, ctx.league),
          },
        ),
      build: (ref) => {
        const wd = whistleDelta(ref, ctx.league);
        return {
          id: "light-whistle",
          title: whistlePaceRankTitle(wd, ctx.league.metrics.whistleShort),
          body: thirdPersonWhistlePaceBody(wd, ctx.league.metrics.whistlePlain),
          refSlug: ref.slug,
          refName: ref.name,
          statLabel: `${ctx.league.metrics.whistleShort} delta vs average`,
          statValue: formatSigned(wd),
        };
      },
    },
  ];
}

/** Collect normalized official keys featured in a synthesis result. */
export function featuredOfficialKeysFromSynthesis(
  synthesis: RankingsSynthesis,
  refs: RefProfile[],
): Set<string> {
  const bySlug = new Map(refs.map((ref) => [ref.slug, ref]));
  const keys = new Set<string>();
  for (const insight of synthesis.insights) {
    if (!insight.refSlug) continue;
    const ref = bySlug.get(insight.refSlug);
    if (ref) keys.add(officialShowcaseKey(ref));
  }
  return keys;
}

export function buildRankingsSynthesis(
  stats: RefStatsFile,
  league: LeagueConfig,
  options: RankingsSynthesisOptions = {},
): RankingsSynthesis {
  const maxCards = options.maxCards ?? MAX_RANKINGS_HIGHLIGHT_CARDS;
  const min = stats.meta.minSampleSize;
  const pool =
    league.id === "nhl" ? filterNhlReferees(stats.refs) : stats.refs;
  const qualified = qualifiedRefs(pool, min);
  const thin = pool.length - qualified.length;
  const baseline = stats.meta.leagueOverBaseline;
  const unit = league.metrics.scoreUnitPlural;
  const atsAvailable = stats.meta.atsAvailable === true;

  const ctx: BuildContext = {
    league,
    qualified,
    baseline,
    unit,
    atsAvailable,
    byScoring: [...qualified].sort((a, b) => b.totalPointsDelta - a.totalPointsDelta),
    byOver: [...qualified].sort((a, b) => b.overRate - a.overRate),
    byWhistle: [...qualified].sort(
      (a, b) => whistleDelta(b, league) - whistleDelta(a, league),
    ),
    byAts: [...qualified].sort(
      (a, b) => (bettingAtsRate(b.bettingStats) ?? -1) - (bettingAtsRate(a.bettingStats) ?? -1),
    ),
    byOuBetting: [...qualified].sort(
      (a, b) => (bettingOuRate(b.bettingStats) ?? -1) - (bettingOuRate(a.bettingStats) ?? -1),
    ),
    excludeOfficialKeys: options.excludeOfficialKeys,
  };

  const highScoring = qualified.filter(
    (r) => r.totalPointsDelta >= SCORING_ASSOCIATION_THRESHOLD,
  );
  const lowScoring = qualified.filter(
    (r) => r.totalPointsDelta <= -SCORING_ASSOCIATION_THRESHOLD,
  );

  const usedSlugs = new Set<string>();
  const insights: RankingsInsight[] = [];

  for (const slot of anomalySlots(ctx)) {
    if (insights.length >= maxCards) break;
    if (!slot.enabled(ctx)) continue;

    const ref = slot.pick(ctx, usedSlugs);
    if (!ref) continue;

    usedSlugs.add(ref.slug);
    insights.push(slot.build(ref, ctx));
  }

  if (insights.length < maxCards) {
    const backfillCandidates = [
      ...ctx.qualified,
    ].sort((a, b) => b.games - a.games);
    for (const ref of backfillCandidates) {
      if (insights.length >= maxCards) break;
      if (usedSlugs.has(ref.slug)) continue;
      if (isAlreadyFeatured(ref, usedSlugs, ctx.excludeOfficialKeys)) continue;

      let insight: RankingsInsight | null = null;
      if (Math.abs(ref.totalPointsDelta) >= 0.15) {
        insight = {
          id: "scoring-depth",
          title: scoringPaceRankTitle(ref.totalPointsDelta),
          body: thirdPersonScoringPaceBody(ref.totalPointsDelta, ctx.unit),
          refSlug: ref.slug,
          refName: ref.name,
          statLabel: "Scoring delta vs average",
          statValue: formatScoringDeltaStat(ref.totalPointsDelta, ctx.league),
        };
      } else if (
        ref.overRate >= 0.52 ||
        ref.overRate <= 0.48
      ) {
        insight = {
          id: "over-depth",
          title:
            ref.overRate >= 0.5
              ? "Elevated over-rate vs baseline"
              : "Lower over-rate vs baseline",
          body: `Line benchmark is ${ctx.baseline} combined ${ctx.unit}; this official clears it ${formatPct(ref.overRate)} of the time in the sample.`,
          refSlug: ref.slug,
          refName: ref.name,
          statLabel: "Over rate",
          statValue: `${(ref.overRate * 100).toFixed(1)}%`,
        };
      } else if (Math.abs(whistleDelta(ref, ctx.league)) >= 1) {
        const wd = whistleDelta(ref, ctx.league);
        insight = {
          id: "whistle-depth",
          title: whistlePaceRankTitle(wd, ctx.league.metrics.whistleShort),
          body: thirdPersonWhistlePaceBody(wd, ctx.league.metrics.whistlePlain),
          refSlug: ref.slug,
          refName: ref.name,
          statLabel: `${ctx.league.metrics.whistleShort} delta vs average`,
          statValue: formatSigned(wd),
        };
      } else {
        insight = {
          id: "sample-depth",
          title: "Deep sample official",
          body: `${ref.games} games in this scope - one of the larger officiating samples on the board.`,
          refSlug: ref.slug,
          refName: ref.name,
          statLabel: "Games",
          statValue: String(ref.games),
        };
      }

      usedSlugs.add(ref.slug);
      insights.push(insight);
    }
  }

  const leagueSummary =
    qualified.length > 0
      ? `${highScoring.length} of ${qualified.length} ${league.officialNounPlural} trend toward higher scoring. ${lowScoring.length} trend lower. Past match tendencies - not predictions.`
      : `Not enough qualified officials in this scope yet. Use the rankings table toggle to include refs below the ${min}-game gate.`;

  return {
    headline: "Top highlights",
    subhead: `High-confidence patterns from officials with ${min}+ matches in the sample.`,
    insights,
    leagueSummary,
    qualifiedCount: qualified.length,
    thinSampleCount: thin,
  };
}

/**
 * Build highlight cards across multiple leagues with cross-league official deduplication.
 * Each league runs the sequential anomaly pipeline; officials already featured are skipped.
 */
export function buildRankingsSynthesisAcrossLeagues(
  leagueIds: readonly LeagueId[],
  options: { maxCardsPerLeague?: number } = {},
): AggregatedRankingsInsight[] {
  const maxCardsPerLeague =
    options.maxCardsPerLeague ?? MAX_RANKINGS_HIGHLIGHT_CARDS;
  const excludeOfficialKeys = new Set<string>();
  const aggregated: AggregatedRankingsInsight[] = [];

  for (const leagueId of leagueIds) {
    const league = LEAGUES[leagueId];
    const { stats } = loadLeagueStats(leagueId);
    const synthesis = buildRankingsSynthesis(stats, league, {
      excludeOfficialKeys,
      maxCards: maxCardsPerLeague,
    });

    for (const insight of synthesis.insights) {
      aggregated.push({ ...insight, leagueId });
    }

    for (const key of featuredOfficialKeysFromSynthesis(synthesis, stats.refs)) {
      excludeOfficialKeys.add(key);
    }
  }

  return aggregated;
}

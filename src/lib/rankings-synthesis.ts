import type { LeagueConfig, LeagueId } from "@/lib/leagues";
import { LEAGUES, leagueGameUnit, leagueGamesLabel, leagueGamesUnit, leaguePerGamePhrase } from "@/lib/leagues";
import { normalizeRefName } from "@/lib/bbr-ref-team-records";
import { formatScoringDeltaStat } from "@/lib/scoring-metrics";
import { filterNhlReferees } from "@/lib/nhl/officials";
import { loadLeagueStats } from "@/lib/load-league-stats";
import {
  createHighlightBadgeRegistry,
  HIGHLIGHT_SCORING_DELTA_MIN,
  meetsOverRateHighlightThreshold,
  meetsScoringHighlightThreshold,
  meetsWhistleHighlightThreshold,
  type HighlightBadgeRegistry,
} from "@/lib/highlight-badge";
import {
  thirdPersonScoringPaceBody,
  thirdPersonWhistlePaceBody,
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
  /** When set, the category pill and stat block link here instead of the ref profile. */
  categoryHref?: string;
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

const BETTING_RATE_HIGH_CONFIDENCE = 0.54;

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
  return meetsWhistleHighlightThreshold(whistleDelta(ref, league), league.id);
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
  badges: HighlightBadgeRegistry;
};

function anomalySlots(ctx: BuildContext): AnomalySlot[] {
  return [
    {
      id: "top-scoring",
      enabled: () => true,
      pick: (_ctx, usedSlugs) =>
        pickTopUniqueRef(ctx.byScoring, usedSlugs, {
          excludeOfficialKeys: ctx.excludeOfficialKeys,
          qualifies: (ref) => meetsScoringHighlightThreshold(ref.totalPointsDelta),
        }),
      build: (ref, ctx) => {
        const delta = ref.totalPointsDelta;
        const badge = ctx.badges.scoringBadge(delta)!;
        return {
          id: "top-scoring",
          title: badge.label,
          body: thirdPersonScoringPaceBody(
            delta,
            ctx.unit,
            leaguePerGamePhrase(ctx.league.id),
          ),
          refSlug: ref.slug,
          refName: ref.name,
          statLabel: "Scoring delta vs avg",
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
          qualifies: (ref) => meetsOverRateHighlightThreshold(ref.overRate),
        }),
      build: (ref, ctx) => ({
        id: "top-over",
        title: ctx.badges.overRateBadge(ref.overRate)!.label,
        body: `Line benchmark is ${ctx.baseline} combined ${ctx.unit}; clears it more often than peers in this sample.`,
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
      build: (ref, ctx) => ({
        id: "top-ats",
        title: ctx.badges.atsBadge().label,
        body: `Home teams cover the spread most often in this sample. Descriptive history only, not a pick signal.`,
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
      build: (ref, ctx) => ({
        id: "top-ou-betting",
        title: ctx.badges.ouBettingBadge().label,
        body: `${
          leagueGameUnit(ctx.league.id) === "match" ? "Matches" : "Games"
        } with this official most often finish over the listed total. Past tendency, not a forecast.`,
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
      build: (ref, ctx) => {
        if (ctx.league.id === "nfl" && ref.nflAnalytics) {
          const perGame = leaguePerGamePhrase(ctx.league.id);
          const badge = ctx.badges.whistleBadge(
            ref.nflAnalytics.flagsDelta,
            ctx.league.metrics.whistleShort,
            ctx.league.id,
          )!;
          return {
            id: "top-whistle",
            title: badge.label,
            body: `${ref.nflAnalytics.avgFlagsPerGame} flags/${leagueGameUnit(ctx.league.id)}, ${formatSigned(ref.nflAnalytics.flagsDelta)} vs league average.`,
            refSlug: ref.slug,
            refName: ref.name,
            statLabel: "Flags delta",
            statValue: formatSigned(ref.nflAnalytics.flagsDelta),
          };
        }
        const wd = whistleDelta(ref, ctx.league);
        const badge = ctx.badges.whistleBadge(
          wd,
          ctx.league.metrics.whistleShort,
          ctx.league.id,
        )!;
        return {
          id: "top-whistle",
          title: badge.label,
          body: thirdPersonWhistlePaceBody(
            wd,
            ctx.league.metrics.whistlePlain,
            leaguePerGamePhrase(ctx.league.id),
          ),
          refSlug: ref.slug,
          refName: ref.name,
          statLabel: "Whistle delta vs avg",
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
            qualifies: (ref) =>
              meetsScoringHighlightThreshold(ref.totalPointsDelta) &&
              ref.totalPointsDelta < 0,
          },
        ),
      build: (ref, ctx) => {
        const delta = ref.totalPointsDelta;
        const badge = ctx.badges.scoringBadge(delta)!;
        return {
          id: "bottom-scoring",
          title: badge.label,
          body: thirdPersonScoringPaceBody(
            delta,
            ctx.unit,
            leaguePerGamePhrase(ctx.league.id),
          ),
          refSlug: ref.slug,
          refName: ref.name,
          statLabel: "Scoring delta vs avg",
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
            qualifies: (ref) =>
              meetsOverRateHighlightThreshold(ref.overRate) && ref.overRate < 0.5,
          },
        ),
      build: (ref, ctx) => ({
        id: "top-under",
        title: ctx.badges.overRateBadge(ref.overRate)!.label,
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
      build: (ref, ctx) => {
        const wd = whistleDelta(ref, ctx.league);
        const badge = ctx.badges.whistleBadge(
          wd,
          ctx.league.metrics.whistleShort,
          ctx.league.id,
        )!;
        return {
          id: "light-whistle",
          title: badge.label,
          body: thirdPersonWhistlePaceBody(
            wd,
            ctx.league.metrics.whistlePlain,
            leaguePerGamePhrase(ctx.league.id),
          ),
          refSlug: ref.slug,
          refName: ref.name,
          statLabel: "Whistle delta vs avg",
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
    badges: createHighlightBadgeRegistry(),
  };

  const highScoring = qualified.filter(
    (r) => r.totalPointsDelta >= HIGHLIGHT_SCORING_DELTA_MIN,
  );
  const lowScoring = qualified.filter(
    (r) => r.totalPointsDelta <= -HIGHLIGHT_SCORING_DELTA_MIN,
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
      if (meetsScoringHighlightThreshold(ref.totalPointsDelta)) {
        const badge = ctx.badges.scoringBadge(ref.totalPointsDelta);
        if (badge) {
          insight = {
            id: "scoring-depth",
            title: badge.label,
            body: thirdPersonScoringPaceBody(
              ref.totalPointsDelta,
              ctx.unit,
              leaguePerGamePhrase(ctx.league.id),
            ),
            refSlug: ref.slug,
            refName: ref.name,
            statLabel: "Scoring delta vs avg",
            statValue: formatScoringDeltaStat(ref.totalPointsDelta, ctx.league),
          };
        }
      } else if (meetsOverRateHighlightThreshold(ref.overRate)) {
        const badge = ctx.badges.overRateBadge(ref.overRate);
        if (badge) {
          insight = {
            id: "over-depth",
            title: badge.label,
            body: `Line benchmark is ${ctx.baseline} combined ${ctx.unit}; this official clears it ${formatPct(ref.overRate)} of the time in the sample.`,
            refSlug: ref.slug,
            refName: ref.name,
            statLabel: "Over rate",
            statValue: `${(ref.overRate * 100).toFixed(1)}%`,
          };
        }
      } else if (whistleQualifies(ref, ctx.league)) {
        const wd = whistleDelta(ref, ctx.league);
        const badge = ctx.badges.whistleBadge(
          wd,
          ctx.league.metrics.whistleShort,
          ctx.league.id,
        );
        if (badge) {
          insight = {
            id: "whistle-depth",
            title: badge.label,
            body: thirdPersonWhistlePaceBody(
              wd,
              ctx.league.metrics.whistlePlain,
              leaguePerGamePhrase(ctx.league.id),
            ),
            refSlug: ref.slug,
            refName: ref.name,
            statLabel: "Whistle delta vs avg",
            statValue: formatSigned(wd),
          };
        }
      } else {
        insight = {
          id: "sample-depth",
          title: "Deep sample official",
          body: `${ref.games} ${leagueGamesUnit(ctx.league.id)} in this scope - one of the larger officiating samples on the board.`,
          refSlug: ref.slug,
          refName: ref.name,
          statLabel: leagueGamesLabel(ctx.league.id),
          statValue: String(ref.games),
        };
      }

      if (!insight) continue;

      usedSlugs.add(ref.slug);
      insights.push(insight);
    }
  }

  const contestUnit = leagueGameUnit(league.id);
  const contestUnitPlural = leagueGamesUnit(league.id);
  const leagueSummary =
    qualified.length > 0
      ? `${highScoring.length} of ${qualified.length} ${league.officialNounPlural} trend toward higher scoring. ${lowScoring.length} trend lower. Past ${contestUnit} tendencies - not predictions.`
      : `Not enough qualified officials in this scope yet. Use the rankings table toggle to include refs below the ${min}-${contestUnit} gate.`;

  return {
    headline: "Top highlights",
    subhead: `High-confidence patterns from officials with ${min}+ ${contestUnitPlural} in the sample.`,
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

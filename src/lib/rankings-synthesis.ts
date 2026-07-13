import type { LeagueConfig } from "@/lib/leagues";
import { formatScoringDeltaStat } from "@/lib/scoring-metrics";
import { filterNhlReferees } from "@/lib/nhl/officials";
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

function whistleDelta(ref: RefProfile, league: LeagueConfig): number {
  if (league.whistleFromMinors) return ref.nhlAnalytics?.minorsDelta ?? ref.foulsDelta;
  if (league.id === "nfl") return ref.nflAnalytics?.flagsDelta ?? ref.foulsDelta;
  return ref.foulsDelta;
}

function qualifiedRefs(refs: RefProfile[], minSample: number): RefProfile[] {
  return refs.filter((r) => r.games >= minSample);
}

export function buildRankingsSynthesis(
  stats: RefStatsFile,
  league: LeagueConfig,
): RankingsSynthesis {
  const min = stats.meta.minSampleSize;
  const pool =
    league.id === "nhl" ? filterNhlReferees(stats.refs) : stats.refs;
  const qualified = qualifiedRefs(pool, min);
  const thin = pool.length - qualified.length;
  const baseline = stats.meta.leagueOverBaseline;
  const unit = league.metrics.scoreUnitPlural;
  const atsAvailable = stats.meta.atsAvailable === true;

  const byScoring = [...qualified].sort((a, b) => b.totalPointsDelta - a.totalPointsDelta);
  const byOver = [...qualified].sort((a, b) => b.overRate - a.overRate);
  const byWhistle = [...qualified].sort(
    (a, b) => whistleDelta(b, league) - whistleDelta(a, league),
  );
  const byAts = [...qualified].sort(
    (a, b) => (bettingAtsRate(b.bettingStats) ?? -1) - (bettingAtsRate(a.bettingStats) ?? -1),
  );
  const byOuBetting = [...qualified].sort(
    (a, b) => (bettingOuRate(b.bettingStats) ?? -1) - (bettingOuRate(a.bettingStats) ?? -1),
  );

  const highScoring = byScoring.filter((r) => r.totalPointsDelta > 0.3);
  const lowScoring = byScoring.filter((r) => r.totalPointsDelta < -0.3);

  const topScorer = byScoring[0];
  const topOver = byOver[0];
  const topWhistle = byWhistle[0];
  const topAts = byAts.find((ref) => bettingAtsRate(ref.bettingStats) !== null);
  const topOuBetting = byOuBetting.find((ref) => bettingOuRate(ref.bettingStats) !== null);

  const insights: RankingsInsight[] = [];

  if (topScorer) {
    const delta = topScorer.totalPointsDelta;
    insights.push({
      id: "top-scoring",
      title: "Biggest scoring bump",
      body: `He averages ${Math.abs(delta).toFixed(1)} more combined ${unit} than the league baseline in his games.`,
      refSlug: topScorer.slug,
      refName: topScorer.name,
      statLabel: "Scoring delta vs average",
      statValue: formatScoringDeltaStat(delta, league),
    });
  }

  if (topOver) {
    insights.push({
      id: "top-over",
      title: "Highest historical over-rate vs baseline",
      body: `Line benchmark is ${baseline} combined ${unit}; he clears it more often than peers in this sample.`,
      refSlug: topOver.slug,
      refName: topOver.name,
      statLabel: "Over rate",
      statValue: `${(topOver.overRate * 100).toFixed(1)}%`,
    });
  }

  if (atsAvailable && topAts) {
    const atsRate = bettingAtsRate(topAts.bettingStats)!;
    insights.push({
      id: "top-ats",
      title: "Strongest home ATS track record",
      body: `Home teams cover the spread most often in his games — descriptive history only, not a pick signal.`,
      refSlug: topAts.slug,
      refName: topAts.name,
      statLabel: "Home ATS",
      statValue: formatPct(atsRate),
    });
  }

  if (atsAvailable && topOuBetting) {
    const ouRate = bettingOuRate(topOuBetting.bettingStats)!;
    insights.push({
      id: "top-ou-betting",
      title: "Highest O/U hit rate vs closing total",
      body: `Games with this official most often finish over the listed total — past tendency, not a forecast.`,
      refSlug: topOuBetting.slug,
      refName: topOuBetting.name,
      statLabel: "O/U hit %",
      statValue: formatPct(ouRate),
    });
  }

  if (topWhistle && league.id === "nfl" && topWhistle.nflAnalytics) {
    insights.push({
      id: "top-whistle",
      title: "Most flags per game",
      body: `${topWhistle.nflAnalytics.avgFlagsPerGame} flags/game, ${formatSigned(topWhistle.nflAnalytics.flagsDelta)} vs league average.`,
      refSlug: topWhistle.slug,
      refName: topWhistle.name,
      statLabel: "Flags delta",
      statValue: formatSigned(topWhistle.nflAnalytics.flagsDelta),
    });
  } else if (topWhistle) {
    const wd = whistleDelta(topWhistle, league);
    insights.push({
      id: "top-whistle",
      title: `Heaviest ${league.metrics.whistleShort.toLowerCase()} ref`,
      body: `He runs ${Math.abs(wd).toFixed(1)} ${league.metrics.whistlePlain} above average per game.`,
      refSlug: topWhistle.slug,
      refName: topWhistle.name,
      statLabel: `${league.metrics.whistleShort} delta vs average`,
      statValue: `${wd > 0 ? "+" : ""}${wd.toFixed(1)}`,
    });
  }

  const leagueSummary =
    qualified.length > 0
      ? `${highScoring.length} of ${qualified.length} ${league.officialNounPlural} associate with higher scoring. ${lowScoring.length} associate with lower totals. Numbers describe past games, not predictions for tonight.`
      : `Not enough games in the sample yet. Turn on “Show thin samples” below to browse everyone.`;

  return {
    headline: `Who moves the ${unit}?`,
    subhead: `The ${qualified.length} ${league.officialNounPlural} with ${min}+ games, ranked by historical associations in their games.`,
    insights,
    leagueSummary,
    qualifiedCount: qualified.length,
    thinSampleCount: thin,
  };
}

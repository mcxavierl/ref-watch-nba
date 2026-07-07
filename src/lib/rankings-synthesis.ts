import type { LeagueConfig } from "@/lib/leagues";
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
  const qualified = qualifiedRefs(stats.refs, min);
  const thin = stats.refs.length - qualified.length;
  const baseline = stats.meta.leagueOverBaseline;
  const unit = league.metrics.scoreUnitPlural;

  const byScoring = [...qualified].sort((a, b) => b.totalPointsDelta - a.totalPointsDelta);
  const byOver = [...qualified].sort((a, b) => b.overRate - a.overRate);
  const byWhistle = [...qualified].sort(
    (a, b) => whistleDelta(b, league) - whistleDelta(a, league),
  );

  const highScoring = byScoring.filter((r) => r.totalPointsDelta > 0.3);
  const lowScoring = byScoring.filter((r) => r.totalPointsDelta < -0.3);

  const topScorer = byScoring[0];
  const topOver = byOver[0];
  const topWhistle = byWhistle[0];

  const insights: RankingsInsight[] = [];

  if (topScorer) {
    const delta = topScorer.totalPointsDelta;
    insights.push({
      id: "top-scoring",
      title: "Biggest scoring bump",
      body: `Crews average ${Math.abs(delta).toFixed(1)} more combined ${unit} than the league baseline.`,
      refSlug: topScorer.slug,
      refName: topScorer.name,
      statLabel: "Scoring delta vs average",
      statValue: `${delta > 0 ? "+" : ""}${delta.toFixed(1)} ${league.id === "nba" ? "PTS" : "G"}`,
    });
  }

  if (topOver) {
    insights.push({
      id: "top-over",
      title: "Most likely to go over",
      body: `Line benchmark is ${baseline} combined ${unit} — this crew clears it more often than peers.`,
      refSlug: topOver.slug,
      refName: topOver.name,
      statLabel: "Over rate",
      statValue: `${(topOver.overRate * 100).toFixed(1)}%`,
    });
  }

  if (topWhistle) {
    const wd = whistleDelta(topWhistle, league);
    insights.push({
      id: "top-whistle",
      title: `Heaviest ${league.metrics.whistleShort.toLowerCase()} crew`,
      body: `Runs ${Math.abs(wd).toFixed(1)} ${league.metrics.whistlePlain} above average per game.`,
      refSlug: topWhistle.slug,
      refName: topWhistle.name,
      statLabel: `${league.metrics.whistleShort} delta vs average`,
      statValue: `${wd > 0 ? "+" : ""}${wd.toFixed(1)}`,
    });
  }

  const leagueSummary =
    qualified.length > 0
      ? `${highScoring.length} of ${qualified.length} ${league.officialNounPlural} tilt toward higher scoring. ${lowScoring.length} lean lower. Numbers describe past games — not picks for tonight.`
      : `Not enough games in the sample yet. Turn on “Show thin samples” below to browse everyone.`;

  return {
    headline: `Who moves the ${unit}?`,
    subhead: `The ${qualified.length} ${league.officialNounPlural} with ${min}+ games, ranked by what actually changed in their games.`,
    insights,
    leagueSummary,
    qualifiedCount: qualified.length,
    thinSampleCount: thin,
  };
}

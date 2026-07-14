import type { RefProfile, RefStatsFile } from "@/lib/types";

export type NflLeaderCategory =
  | "flags"
  | "penaltyYards"
  | "leverageImpact"
  | "scoring"
  | "overRate"
  | "balance";

export interface NflLeaderEntry {
  category: NflLeaderCategory;
  title: string;
  detail: string;
  ref: RefProfile;
  value: string;
  delta?: number;
}

const MIN_GAMES = 15;

function qualified(refs: RefProfile[], min: number): RefProfile[] {
  return refs.filter((r) => r.games >= min && r.nflAnalytics);
}

export function buildNflAnalyticsLeaders(stats: RefStatsFile): NflLeaderEntry[] {
  const min = Math.min(MIN_GAMES, stats.meta.minSampleSize);
  const pool = qualified(stats.refs, min);
  if (pool.length === 0) return [];

  const byFlags = [...pool].sort(
    (a, b) =>
      (b.nflAnalytics!.flagsDelta ?? 0) - (a.nflAnalytics!.flagsDelta ?? 0),
  );
  const byYards = [...pool].sort(
    (a, b) =>
      (b.nflAnalytics!.penaltyYardsDelta ?? 0) -
      (a.nflAnalytics!.penaltyYardsDelta ?? 0),
  );
  const byLeverage = [...pool]
    .filter((r) => r.nflAnalytics?.avgHighLeverageImpactPerGame !== undefined)
    .sort(
      (a, b) =>
        (b.nflAnalytics!.highLeverageImpactDelta ?? 0) -
        (a.nflAnalytics!.highLeverageImpactDelta ?? 0),
    );
  const byScoring = [...pool].sort(
    (a, b) => b.totalPointsDelta - a.totalPointsDelta,
  );
  const byOver = [...pool].sort((a, b) => b.overRate - a.overRate);
  const byBalance = [...pool].sort(
    (a, b) =>
      (b.nflAnalytics!.balancedGameRate ?? 0) -
      (a.nflAnalytics!.balancedGameRate ?? 0),
  );

  const leaders: NflLeaderEntry[] = [];

  const flagRef = byFlags[0];
  if (flagRef?.nflAnalytics) {
    leaders.push({
      category: "flags",
      title: "Most flags called",
      detail: `${flagRef.nflAnalytics.avgFlagsPerGame} flags/game avg`,
      ref: flagRef,
      value: `+${flagRef.nflAnalytics.flagsDelta.toFixed(1)} vs league`,
      delta: flagRef.nflAnalytics.flagsDelta,
    });
  }

  const yardsRef = byYards[0];
  if (yardsRef?.nflAnalytics) {
    leaders.push({
      category: "penaltyYards",
      title: "Highest penalty yards",
      detail: `${yardsRef.nflAnalytics.avgPenaltyYardsPerGame} yds/game avg`,
      ref: yardsRef,
      value: `+${yardsRef.nflAnalytics.penaltyYardsDelta.toFixed(1)} vs league`,
      delta: yardsRef.nflAnalytics.penaltyYardsDelta,
    });
  }

  const leverageRef = byLeverage[0];
  if (leverageRef?.nflAnalytics?.avgHighLeverageImpactPerGame !== undefined) {
    leaders.push({
      category: "leverageImpact",
      title: "Highest leverage impact",
      detail: `${leverageRef.nflAnalytics.avgHighLeverageImpactPerGame} impact/game`,
      ref: leverageRef,
      value: `+${(leverageRef.nflAnalytics.highLeverageImpactDelta ?? 0).toFixed(1)} vs league`,
      delta: leverageRef.nflAnalytics.highLeverageImpactDelta,
    });
  }

  const scoreRef = byScoring[0];
  if (scoreRef) {
    leaders.push({
      category: "scoring",
      title: "Highest-scoring crews",
      detail: `${scoreRef.avgTotalPoints.toFixed(1)} combined pts/game`,
      ref: scoreRef,
      value: `${scoreRef.totalPointsDelta > 0 ? "+" : ""}${scoreRef.totalPointsDelta.toFixed(1)} pts vs avg`,
      delta: scoreRef.totalPointsDelta,
    });
  }

  const overRef = byOver[0];
  if (overRef) {
    leaders.push({
      category: "overRate",
      title: "Most overs vs baseline",
      detail: `Over ${stats.meta.leagueOverBaseline} pts benchmark`,
      ref: overRef,
      value: `${(overRef.overRate * 100).toFixed(1)}% over rate`,
    });
  }

  const balanceRef = byBalance[0];
  if (balanceRef?.nflAnalytics) {
    leaders.push({
      category: "balance",
      title: "Most balanced flag splits",
      detail: `${balanceRef.nflAnalytics.balanceKind} · ${(balanceRef.nflAnalytics.balancedGameRate * 100).toFixed(0)}% within 1 flag`,
      ref: balanceRef,
      value: balanceRef.nflAnalytics.balanceKind,
    });
  }

  return leaders;
}

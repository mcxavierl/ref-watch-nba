import type { RefProfile, RefStatsFile } from "@/lib/types";

export type NflLeaderCategory =
  | "flags"
  | "penaltyYards"
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
  return refs.filter((r) => r.games >= min && r.cfbAnalytics);
}

export function buildCfbAnalyticsLeaders(stats: RefStatsFile): NflLeaderEntry[] {
  const min = Math.min(MIN_GAMES, stats.meta.minSampleSize);
  const pool = qualified(stats.refs, min);
  if (pool.length === 0) return [];

  const byFlags = [...pool].sort(
    (a, b) =>
      (b.cfbAnalytics!.flagsDelta ?? 0) - (a.cfbAnalytics!.flagsDelta ?? 0),
  );
  const byYards = [...pool].sort(
    (a, b) =>
      (b.cfbAnalytics!.penaltyYardsDelta ?? 0) -
      (a.cfbAnalytics!.penaltyYardsDelta ?? 0),
  );
  const byScoring = [...pool].sort(
    (a, b) => b.totalPointsDelta - a.totalPointsDelta,
  );
  const byOver = [...pool].sort((a, b) => b.overRate - a.overRate);
  const byBalance = [...pool].sort(
    (a, b) =>
      (b.cfbAnalytics!.balancedGameRate ?? 0) -
      (a.cfbAnalytics!.balancedGameRate ?? 0),
  );

  const leaders: NflLeaderEntry[] = [];

  const flagRef = byFlags[0];
  if (flagRef?.cfbAnalytics) {
    leaders.push({
      category: "flags",
      title: "Most flags called",
      detail: `${flagRef.cfbAnalytics.avgFlagsPerGame} flags/game avg`,
      ref: flagRef,
      value: `+${flagRef.cfbAnalytics.flagsDelta.toFixed(1)} vs league`,
      delta: flagRef.cfbAnalytics.flagsDelta,
    });
  }

  const yardsRef = byYards[0];
  if (yardsRef?.cfbAnalytics) {
    leaders.push({
      category: "penaltyYards",
      title: "Highest penalty yards",
      detail: `${yardsRef.cfbAnalytics.avgPenaltyYardsPerGame} yds/game avg`,
      ref: yardsRef,
      value: `+${yardsRef.cfbAnalytics.penaltyYardsDelta.toFixed(1)} vs league`,
      delta: yardsRef.cfbAnalytics.penaltyYardsDelta,
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
  if (balanceRef?.cfbAnalytics) {
    leaders.push({
      category: "balance",
      title: "Most balanced flag splits",
      detail: `${balanceRef.cfbAnalytics.balanceKind} · ${(balanceRef.cfbAnalytics.balancedGameRate * 100).toFixed(0)}% within 1 flag`,
      ref: balanceRef,
      value: balanceRef.cfbAnalytics.balanceKind,
    });
  }

  return leaders;
}

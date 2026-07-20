import type { RefProfile, RefStatsFile } from "@/lib/types";
import { variancePercent } from "@/lib/metric-variance-display";

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
  metric?: {
    primaryTotal: string;
    variancePct: number;
    comparisonCaption?: string;
  };
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
    const flagsDelta = flagRef.cfbAnalytics.flagsDelta;
    leaders.push({
      category: "flags",
      title: "Flags called",
      detail: `${flagRef.name} leads verified penalty volume in the sample window.`,
      ref: flagRef,
      value: `+${flagsDelta.toFixed(1)} vs league`,
      delta: flagsDelta,
      metric: {
        primaryTotal: `${flagRef.cfbAnalytics.avgFlagsPerGame.toFixed(1)} flags/game`,
        variancePct: variancePercent(flagsDelta, stats.meta.leagueAvgFouls),
        comparisonCaption: "vs league avg",
      },
    });
  }

  const yardsRef = byYards[0];
  if (yardsRef?.cfbAnalytics) {
    const yardsDelta = yardsRef.cfbAnalytics.penaltyYardsDelta;
    leaders.push({
      category: "penaltyYards",
      title: "Penalty yards",
      detail: `${yardsRef.name} posts the heaviest yardage pace in the sample window.`,
      ref: yardsRef,
      value: `+${yardsDelta.toFixed(1)} vs league`,
      delta: yardsDelta,
      metric: {
        primaryTotal: `${yardsRef.cfbAnalytics.avgPenaltyYardsPerGame.toFixed(1)} yards/game`,
        variancePct: variancePercent(yardsDelta, stats.meta.leagueAvgPenaltyYards ?? 95),
        comparisonCaption: "vs league avg",
      },
    });
  }

  const scoreRef = byScoring[0];
  if (scoreRef) {
    const pointsDelta = scoreRef.totalPointsDelta;
    leaders.push({
      category: "scoring",
      title: "Combined points",
      detail: `${scoreRef.name} runs the hottest combined scoring pace in the sample window.`,
      ref: scoreRef,
      value: `${pointsDelta > 0 ? "+" : ""}${pointsDelta.toFixed(1)} pts vs avg`,
      delta: pointsDelta,
      metric: {
        primaryTotal: `${scoreRef.avgTotalPoints.toFixed(1)} points/game`,
        variancePct: variancePercent(pointsDelta, stats.meta.leagueAvgTotal),
        comparisonCaption: "vs league avg",
      },
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

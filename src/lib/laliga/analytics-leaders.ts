import type { RefProfile, RefStatsFile } from "@/lib/types";

export type EplLeaderCategory =
  | "fouls"
  | "yellowCards"
  | "scoring"
  | "overRate"
  | "balance"
  | "penalties";

export interface EplLeaderEntry {
  category: EplLeaderCategory;
  title: string;
  detail: string;
  ref: RefProfile;
  value: string;
  delta?: number;
}

const MIN_GAMES = 15;

function qualified(refs: RefProfile[], min: number): RefProfile[] {
  return refs.filter((r) => r.games >= min && r.eplAnalytics);
}

export function buildLaligaAnalyticsLeaders(stats: RefStatsFile): EplLeaderEntry[] {
  const min = Math.min(MIN_GAMES, stats.meta.minSampleSize);
  const pool = qualified(stats.refs, min);
  if (pool.length === 0) return [];

  const byFouls = [...pool].sort(
    (a, b) =>
      (b.eplAnalytics!.foulsDelta ?? 0) - (a.eplAnalytics!.foulsDelta ?? 0),
  );
  const byYellow = [...pool].sort(
    (a, b) =>
      (b.eplAnalytics!.yellowCardsDelta ?? 0) -
      (a.eplAnalytics!.yellowCardsDelta ?? 0),
  );
  const byScoring = [...pool].sort(
    (a, b) => b.totalPointsDelta - a.totalPointsDelta,
  );
  const byOver = [...pool].sort((a, b) => b.overRate - a.overRate);
  const byBalance = [...pool].sort(
    (a, b) =>
      (b.eplAnalytics!.balancedGameRate ?? 0) -
      (a.eplAnalytics!.balancedGameRate ?? 0),
  );
  const byPenalties = [...pool].sort(
    (a, b) =>
      (b.eplAnalytics!.penaltiesDelta ?? 0) -
      (a.eplAnalytics!.penaltiesDelta ?? 0),
  );

  const leaders: EplLeaderEntry[] = [];

  const foulRef = byFouls[0];
  if (foulRef?.eplAnalytics) {
    leaders.push({
      category: "fouls",
      title: "Most fouls called",
      detail: `${foulRef.eplAnalytics.avgFoulsPerGame} fouls/match avg`,
      ref: foulRef,
      value: `+${foulRef.eplAnalytics.foulsDelta.toFixed(1)} vs league`,
      delta: foulRef.eplAnalytics.foulsDelta,
    });
  }

  const yellowRef = byYellow[0];
  if (yellowRef?.eplAnalytics) {
    leaders.push({
      category: "yellowCards",
      title: "Most yellow cards",
      detail: `${yellowRef.eplAnalytics.avgYellowCardsPerGame} yellows/match avg`,
      ref: yellowRef,
      value: `+${yellowRef.eplAnalytics.yellowCardsDelta.toFixed(1)} vs league`,
      delta: yellowRef.eplAnalytics.yellowCardsDelta,
    });
  }

  const scoreRef = byScoring[0];
  if (scoreRef) {
    leaders.push({
      category: "scoring",
      title: "Highest-scoring refs",
      detail: `${scoreRef.avgTotalPoints.toFixed(1)} combined goals/match`,
      ref: scoreRef,
      value: `${scoreRef.totalPointsDelta > 0 ? "+" : ""}${scoreRef.totalPointsDelta.toFixed(1)} goals vs avg`,
      delta: scoreRef.totalPointsDelta,
    });
  }

  const overRef = byOver[0];
  if (overRef) {
    leaders.push({
      category: "overRate",
      title: "Most overs vs baseline",
      detail: `Over ${stats.meta.leagueOverBaseline} goals benchmark`,
      ref: overRef,
      value: `${(overRef.overRate * 100).toFixed(1)}% over rate`,
    });
  }

  const balanceRef = byBalance[0];
  if (balanceRef?.eplAnalytics) {
    leaders.push({
      category: "balance",
      title: "Most balanced card splits",
      detail: `${balanceRef.eplAnalytics.balanceKind} · ${(balanceRef.eplAnalytics.balancedGameRate * 100).toFixed(0)}% within 1 card`,
      ref: balanceRef,
      value: balanceRef.eplAnalytics.balanceKind,
    });
  }

  const penRef = byPenalties[0];
  if (penRef?.eplAnalytics && penRef.eplAnalytics.avgPenaltiesPerGame > 0) {
    leaders.push({
      category: "penalties",
      title: "Most penalties awarded",
      detail: `${penRef.eplAnalytics.avgPenaltiesPerGame} pens/match avg`,
      ref: penRef,
      value: `+${penRef.eplAnalytics.penaltiesDelta.toFixed(2)} vs league`,
      delta: penRef.eplAnalytics.penaltiesDelta,
    });
  }

  return leaders;
}

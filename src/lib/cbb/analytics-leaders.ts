import type { RefProfile, RefStatsFile } from "@/lib/types";
import { variancePercent } from "@/lib/metric-variance-display";

export type CbbLeaderCategory = "fouls" | "scoring" | "overRate" | "homeCover";

export interface CbbLeaderEntry {
  category: CbbLeaderCategory;
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

const MIN_GAMES = 12;

function qualified(refs: RefProfile[], min: number): RefProfile[] {
  return refs.filter((r) => r.games >= min);
}

export function buildCbbAnalyticsLeaders(stats: RefStatsFile): CbbLeaderEntry[] {
  const min = Math.min(MIN_GAMES, stats.meta.minSampleSize);
  const pool = qualified(stats.refs, min);
  if (pool.length === 0) return [];

  const byFouls = [...pool].sort((a, b) => b.foulsDelta - a.foulsDelta);
  const byScoring = [...pool].sort(
    (a, b) => b.totalPointsDelta - a.totalPointsDelta,
  );
  const byOver = [...pool].sort((a, b) => b.overRate - a.overRate);
  const byHomeCover = [...pool]
    .filter((r) => r.homeCoverRate !== null)
    .sort((a, b) => (b.homeCoverRate ?? 0) - (a.homeCoverRate ?? 0));

  const leaders: CbbLeaderEntry[] = [];

  const foulRef = byFouls[0];
  if (foulRef) {
    const foulsDelta = foulRef.foulsDelta;
    leaders.push({
      category: "fouls",
      title: "Fouls called",
      detail: `${foulRef.name} runs the heaviest whistle pace in this sample.`,
      ref: foulRef,
      value: `${foulsDelta > 0 ? "+" : ""}${foulsDelta.toFixed(1)} vs avg`,
      delta: foulsDelta,
      metric: {
        primaryTotal: `${foulRef.avgFouls.toFixed(1)} fouls/game`,
        variancePct: variancePercent(foulsDelta, stats.meta.leagueAvgFouls),
        comparisonCaption: "vs conference avg",
      },
    });
  }

  const scoreRef = byScoring[0];
  if (scoreRef) {
    const pointsDelta = scoreRef.totalPointsDelta;
    leaders.push({
      category: "scoring",
      title: "Combined points",
      detail: `${scoreRef.name} posts the hottest combined scoring pace in this sample.`,
      ref: scoreRef,
      value: `${pointsDelta > 0 ? "+" : ""}${pointsDelta.toFixed(1)} pts vs avg`,
      delta: pointsDelta,
      metric: {
        primaryTotal: `${scoreRef.avgTotalPoints.toFixed(1)} points/game`,
        variancePct: variancePercent(pointsDelta, stats.meta.leagueAvgTotal),
        comparisonCaption: "vs conference avg",
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

  const homeRef = byHomeCover[0];
  if (homeRef && homeRef.homeCoverRate !== null) {
    leaders.push({
      category: "homeCover",
      title: "Home team cover rate",
      detail: `${homeRef.name} sees the strongest home-side cover trend in this sample.`,
      ref: homeRef,
      value: `${(homeRef.homeCoverRate * 100).toFixed(1)}% home cover`,
    });
  }

  return leaders;
}

import type { LeagueConfig } from "@/lib/leagues";
import { deltaTone as metricDeltaTone } from "@/lib/metricTone";
import { qualifiedRefs, sortRefRankings, type RefRankingSort } from "@/lib/rankings";
import { formatSigned } from "@/lib/stats-utils";
import type { RefProfile, RefStatsFile } from "@/lib/types";

export type NhlDirectoryMetric = "goals" | "pim" | "ppo";

export const NHL_DIRECTORY_METRICS: {
  id: NhlDirectoryMetric;
  label: string;
}[] = [
  { id: "goals", label: "Goal Δ" },
  { id: "pim", label: "PIM Δ" },
  { id: "ppo", label: "PPO Δ" },
];

export type RefsDirectoryTab = "over-high" | "over-low" | "experienced";

export const REFS_DIRECTORY_TABS: {
  id: RefsDirectoryTab;
  label: string;
  description: string;
}[] = [
  {
    id: "over-high",
    label: "Highest over rates",
    description: "Officials whose games finish above the league benchmark most often.",
  },
  {
    id: "over-low",
    label: "Highest under rates",
    description: "Officials whose games finish below the league benchmark most often.",
  },
  {
    id: "experienced",
    label: "Most experienced",
    description: "Largest multi-season samples in the dataset.",
  },
];

export const REFS_DIRECTORY_INITIAL_COUNT = 25;

export interface RefsDirectoryMeta {
  seasons: string[];
  seasonCount: number;
  minSampleSize: number;
  leagueOverBaseline: number;
  qualifiedCount: number;
  totalGameRecords: number;
  totalGameRecordsLabel: string;
}

export interface RefsDirectoryContext {
  refs: RefProfile[];
  meta: RefsDirectoryMeta;
  league: LeagueConfig;
}

function formatRoundedPlus(n: number): string {
  if (n >= 1000) {
    const rounded = Math.floor(n / 1000) * 1000;
    return `${rounded.toLocaleString("en-US")}+`;
  }
  return `${n.toLocaleString("en-US")}+`;
}

export function buildRefsDirectoryContext(
  stats: RefStatsFile,
  league: LeagueConfig,
): RefsDirectoryContext {
  const qualified = qualifiedRefs(stats.refs, stats.meta.minSampleSize);
  const totalGameRecords = qualified.reduce((sum, ref) => sum + ref.games, 0);

  return {
    refs: qualified,
    meta: {
      seasons: stats.meta.seasons,
      seasonCount: stats.meta.seasons.length,
      minSampleSize: stats.meta.minSampleSize,
      leagueOverBaseline: stats.meta.leagueOverBaseline,
      qualifiedCount: qualified.length,
      totalGameRecords,
      totalGameRecordsLabel: formatRoundedPlus(totalGameRecords),
    },
    league,
  };
}

function tabToSort(tab: RefsDirectoryTab): RefRankingSort {
  switch (tab) {
    case "over-high":
      return "overRate-desc";
    case "over-low":
      return "overRate-asc";
    case "experienced":
      return "games-desc";
  }
}

export function sortRefsDirectory(
  refs: RefProfile[],
  tab: RefsDirectoryTab,
): RefProfile[] {
  return sortRefRankings(refs, tabToSort(tab));
}

export function deltaTone(
  delta: number,
  overBaseline: number,
): "positive" | "negative" | "neutral" {
  const threshold = overBaseline > 50 ? 2 : 0.3;
  if (delta > threshold) return "positive";
  if (delta < -threshold) return "negative";
  return "neutral";
}

export function formatDirectoryDelta(n: number, decimals = 1): string {
  if (Math.abs(n) < 0.05) return (0).toFixed(decimals);
  return formatSigned(n, decimals);
}

export function nhlDirectoryMetricDelta(
  ref: RefProfile,
  metric: NhlDirectoryMetric,
): number | null {
  switch (metric) {
    case "goals":
      return ref.totalPointsDelta;
    case "pim":
      return ref.foulsDelta;
    case "ppo":
      return null;
  }
}

export function directoryDeltaTone(
  delta: number,
  overBaseline: number,
  heatMap = false,
): "positive" | "negative" | "neutral" {
  if (Math.abs(delta) < 0.05) return "neutral";
  if (heatMap) return metricDeltaTone(delta, 0);
  return deltaTone(delta, overBaseline);
}

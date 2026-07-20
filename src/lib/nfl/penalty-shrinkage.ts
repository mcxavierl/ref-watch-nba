import {
  shrinkPenaltyDelta,
  shrinkRateTowardLeagueMean,
  shrinkageSampleN,
  shrunkMetricTooltip,
  type ShrunkMetric,
} from "@/lib/bayesian-shrinkage";
import type { NflRefAnalytics, RefProfile } from "@/lib/types";

export type ShrunkPenaltyMetric = {
  display: number;
  observed: number;
  metric: ShrunkMetric;
  tooltip: string;
};

export type ShrunkNflAnalyticsDisplay = {
  sampleN: number;
  avgFlagsPerGame: ShrunkPenaltyMetric;
  flagsDelta: ShrunkPenaltyMetric;
  avgPenaltyYardsPerGame: ShrunkPenaltyMetric;
  penaltyYardsDelta: ShrunkPenaltyMetric;
  avgHighLeverageImpactPerGame?: ShrunkPenaltyMetric;
  highLeverageImpactDelta?: ShrunkPenaltyMetric;
};

function toDisplayMetric(
  metric: ShrunkMetric,
  label: string,
  unit = "",
  priorLabel?: string,
): ShrunkPenaltyMetric {
  return {
    display: metric.shrunk,
    observed: metric.observed,
    metric,
    tooltip: shrunkMetricTooltip(metric, { label, unit, priorLabel }),
  };
}

export function resolvePenaltyShrinkageSampleN(
  profile: Pick<RefProfile, "gsniHighLeverageMinutes" | "games">,
  analytics?: Pick<NflRefAnalytics, "leverageSampleGames">,
): number {
  return shrinkageSampleN(
    profile.gsniHighLeverageMinutes,
    analytics?.leverageSampleGames ?? profile.games,
  );
}

export function shrinkNflAnalyticsDisplay(
  analytics: NflRefAnalytics,
  sampleN: number,
  leagueAvgFouls: number,
  leagueAvgPenaltyYards: number,
  leagueAvgHighLeverageImpact = 8.2,
): ShrunkNflAnalyticsDisplay {
  const flagsRate = shrinkRateTowardLeagueMean(
    analytics.avgFlagsPerGame,
    leagueAvgFouls,
    sampleN,
  );
  const flagsDelta = shrinkPenaltyDelta(analytics.flagsDelta, sampleN);
  const yardsRate = shrinkRateTowardLeagueMean(
    analytics.avgPenaltyYardsPerGame,
    leagueAvgPenaltyYards,
    sampleN,
  );
  const yardsDelta = shrinkPenaltyDelta(analytics.penaltyYardsDelta, sampleN);

  const result: ShrunkNflAnalyticsDisplay = {
    sampleN,
    avgFlagsPerGame: toDisplayMetric(flagsRate, "Flags per game", "flags/game", "league avg"),
    flagsDelta: toDisplayMetric(flagsDelta, "Flags delta", "flags/game"),
    avgPenaltyYardsPerGame: toDisplayMetric(
      yardsRate,
      "Penalty yards",
      "yards/game",
      "league avg",
    ),
    penaltyYardsDelta: toDisplayMetric(yardsDelta, "Penalty yards delta", "yards/game"),
  };

  if (analytics.avgHighLeverageImpactPerGame !== undefined) {
    const hlRate = shrinkRateTowardLeagueMean(
      analytics.avgHighLeverageImpactPerGame,
      leagueAvgHighLeverageImpact,
      sampleN,
    );
    const hlDelta = shrinkPenaltyDelta(
      analytics.highLeverageImpactDelta ?? 0,
      sampleN,
    );
    result.avgHighLeverageImpactPerGame = toDisplayMetric(
      hlRate,
      "High-leverage impact",
      "impact/game",
      "league avg",
    );
    result.highLeverageImpactDelta = toDisplayMetric(
      hlDelta,
      "High-leverage impact delta",
      "impact/game",
    );
  }

  return result;
}

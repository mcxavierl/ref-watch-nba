"use client";

import { useMemo, useState } from "react";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import {
  resolveWhistleMetricDisplay,
  type WhistleMetricView,
} from "@/lib/nfl/ref-penalty-impact-display";
import {
  resolvePenaltyShrinkageSampleN,
  shrinkNflAnalyticsDisplay,
  type ShrunkNflAnalyticsDisplay,
} from "@/lib/nfl/penalty-shrinkage";
import type { NflRefAnalytics, RefProfile } from "@/lib/types";

export function RefereeWhistleMetricToggle({
  analytics,
  showMetrics = true,
  className = "",
  shrunk: shrunkProp,
  profile,
  leagueAvgFouls = 13,
  leagueAvgPenaltyYards = 95,
}: {
  analytics: NflRefAnalytics;
  showMetrics?: boolean;
  className?: string;
  shrunk?: ShrunkNflAnalyticsDisplay;
  profile?: Pick<RefProfile, "gsniHighLeverageMinutes" | "games">;
  leagueAvgFouls?: number;
  leagueAvgPenaltyYards?: number;
}) {
  const hasLeverage = analytics.avgHighLeverageImpactPerGame !== undefined;
  const [view, setView] = useState<WhistleMetricView>(
    hasLeverage ? "leverage" : "volume",
  );

  const shrunk = useMemo(() => {
    if (shrunkProp) return shrunkProp;
    const sampleN = profile
      ? resolvePenaltyShrinkageSampleN(profile, analytics)
      : analytics.leverageSampleGames ?? 0;
    return shrinkNflAnalyticsDisplay(
      analytics,
      sampleN,
      leagueAvgFouls,
      leagueAvgPenaltyYards,
    );
  }, [analytics, leagueAvgFouls, leagueAvgPenaltyYards, profile, shrunkProp]);

  if (!showMetrics) return null;

  const display = resolveWhistleMetricDisplay(analytics, view, shrunk);

  const valueNode = (
    <span className="ref-whistle-metric-toggle__value">{display.value}</span>
  );

  return (
    <div className={`ref-whistle-metric-toggle ${className}`.trim()}>
      {hasLeverage ? (
        <div
          className="ref-whistle-metric-toggle__controls"
          role="group"
          aria-label="Whistle metric view"
        >
          <button
            type="button"
            className={`ref-whistle-metric-toggle__btn${
              view === "volume" ? " ref-whistle-metric-toggle__btn--active" : ""
            }`}
            aria-pressed={view === "volume"}
            onClick={() => setView("volume")}
          >
            Volume
          </button>
          <button
            type="button"
            className={`ref-whistle-metric-toggle__btn${
              view === "leverage"
                ? " ref-whistle-metric-toggle__btn--active"
                : ""
            }`}
            aria-pressed={view === "leverage"}
            onClick={() => setView("leverage")}
          >
            Leverage impact
          </button>
        </div>
      ) : null}

      <div className="ref-whistle-metric-toggle__metric">
        <span className="ref-whistle-metric-toggle__label">{display.label}</span>
        {display.tooltip ? (
          <MetricInfoHint hint={display.tooltip}>{valueNode}</MetricInfoHint>
        ) : (
          valueNode
        )}
        <span className="ref-whistle-metric-toggle__detail">{display.detail}</span>
        {view === "leverage" && analytics.highLeverageFlagRate !== undefined ? (
          <span className="ref-whistle-metric-toggle__detail">
            {Math.round(analytics.highLeverageFlagRate * 100)}% of flags high/critical
            {analytics.leverageSampleGames
              ? ` · ${analytics.leverageSampleGames} PBP-backed games`
              : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}

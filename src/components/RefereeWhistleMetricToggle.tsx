"use client";

import { useState } from "react";
import {
  resolveWhistleMetricDisplay,
  type WhistleMetricView,
} from "@/lib/nfl/ref-penalty-impact";
import type { NflRefAnalytics } from "@/lib/types";

export function RefereeWhistleMetricToggle({
  analytics,
  showMetrics = true,
  className = "",
}: {
  analytics: NflRefAnalytics;
  showMetrics?: boolean;
  className?: string;
}) {
  const hasLeverage = analytics.avgHighLeverageImpactPerGame !== undefined;
  const [view, setView] = useState<WhistleMetricView>(
    hasLeverage ? "leverage" : "volume",
  );

  if (!showMetrics) return null;

  const display = resolveWhistleMetricDisplay(analytics, view);

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
        <span className="ref-whistle-metric-toggle__value">{display.value}</span>
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

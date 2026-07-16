"use client";

import { useState } from "react";
import {
  MARQUEE_CI_MIN_GAMES,
  passesMarqueeComparisonGate,
  type RefMarqueePerformance,
} from "@/lib/marquee-metrics.shared";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import {
  RefDashboardStatCell,
  RefDashboardStatGrid,
} from "@/components/RefDashboardStatGrid";

function formatRate(rate: number | null): string {
  if (rate === null) return "-";
  return formatPct(rate);
}

export function RefMarqueePerformanceSection({
  performance,
  showMetrics = true,
  foulLabel = "Fouls per game",
}: {
  performance: RefMarqueePerformance;
  showMetrics?: boolean;
  foulLabel?: string;
}) {
  const [expanded, setExpanded] = useState(true);

  if (!showMetrics || !passesMarqueeComparisonGate(performance)) {
    return null;
  }

  const overDeltaPp =
    (performance.marqueeOverRate - performance.baselineOverRate) * 100;
  const atsDeltaPp =
    performance.marqueeAtsCoverRate !== null &&
    performance.baselineAtsCoverRate !== null
      ? (performance.marqueeAtsCoverRate - performance.baselineAtsCoverRate) * 100
      : null;

  return (
    <section className="data-card">
      <div className="ref-table-section-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">
            Prime-Time / Marquee Performance
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            High-profile games only: national windows, derbies, top-table clashes,
            and max-capacity venues versus this official&apos;s general baseline.
          </p>
        </div>
        <button
          type="button"
          className="finding-filter-chip"
          aria-pressed={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Hide marquee split" : "Show marquee split"}
        </button>
      </div>

      {expanded && (
        <div className="px-4 py-4 sm:px-5">
          <RefDashboardStatGrid>
            <RefDashboardStatCell
              label="Marquee games"
              value={String(performance.marqueeGames)}
              detail={`${performance.baselineGames} non-marquee baseline`}
            />
            <RefDashboardStatCell
              label="Marquee over rate"
              value={formatRate(performance.marqueeOverRate)}
              detail={`Baseline ${formatRate(performance.baselineOverRate)} (${formatSigned(overDeltaPp)} pts)`}
            />
            <RefDashboardStatCell
              label="Marquee ATS cover"
              value={formatRate(performance.marqueeAtsCoverRate)}
              detail={
                atsDeltaPp !== null
                  ? `Baseline ${formatRate(performance.baselineAtsCoverRate)} (${formatSigned(atsDeltaPp)} pts)`
                  : "No closing-line sample"
              }
            />
            <RefDashboardStatCell
              label={`Marquee ${foulLabel.toLowerCase()}`}
              value={performance.marqueeAvgFouls.toFixed(1)}
              detail={`Baseline ${performance.baselineAvgFouls.toFixed(1)}`}
            />
          </RefDashboardStatGrid>

          {performance.marqueeGames >= MARQUEE_CI_MIN_GAMES &&
            performance.overRateCi && (
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Marquee confidence interval
                </p>
                <p className="mt-1 text-sm text-zinc-700">
                  Over rate 95% CI: {performance.overRateCi.label}
                  {performance.atsCoverCi
                    ? ` · ATS cover 95% CI: ${performance.atsCoverCi.label}`
                    : ""}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Wilson interval shown when marquee sample exceeds{" "}
                  {MARQUEE_CI_MIN_GAMES} games.
                </p>
              </div>
            )}

          {performance.sampleTags.length > 0 && (
            <p className="mt-3 text-xs text-zinc-500">
              Marquee tags in sample: {performance.sampleTags.join(" · ")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

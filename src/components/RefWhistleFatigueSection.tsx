"use client";

import { useState } from "react";
import { GlossaryMetricLabel } from "@/components/shared/MetricTermLabel";
import {
  RefDashboardStatCell,
  RefDashboardStatGrid,
} from "@/components/RefDashboardStatGrid";
import type { RefWhistleFatigueProfile } from "@/lib/whistle-fatigue";
import { formatSigned } from "@/lib/stats-utils";
import { semanticImpactTextClass } from "@/lib/semantic-impact";

function patternLabel(pattern: RefWhistleFatigueProfile["pattern"]): string {
  if (pattern === "fatigue") return "Whistle fatigue";
  if (pattern === "escalation") return "Late escalation";
  return "Stable pace";
}

function sparkline(values: number[], labels: string[]): string {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const bar = "▮".repeat(Math.max(1, Math.round((value / max) * 4)));
      return `${labels[index] ?? `P${index + 1}`} ${value.toFixed(1)} ${bar}`;
    })
    .join(" · ");
}

export function RefWhistleFatigueSection({
  profile,
  showMetrics = true,
}: {
  profile: RefWhistleFatigueProfile;
  showMetrics?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  if (!showMetrics) return null;

  return (
    <section className="ref-profile-section">
      <div className="ref-table-section-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold tracking-tight">
            <GlossaryMetricLabel id="whistle-drift">
              Late-Game Whistle Drift
            </GlossaryMetricLabel>
          </h2>
          <p className="mt-1 text-sm font-normal text-slate-400">
            Second-half melt tracking: how this official&apos;s{" "}
            {profile.metricLabel} volume shifts from early periods to late-game
            windows.
          </p>
        </div>
        <button
          type="button"
          className="finding-filter-chip"
          aria-pressed={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Hide drift split" : "Show drift split"}
        </button>
      </div>

      {expanded && (
        <div className="ref-table-section-body">
          <p className="text-sm font-medium text-zinc-800">{profile.driftHeadline}</p>

          <RefDashboardStatGrid>
            <RefDashboardStatCell
              label="Drift pattern"
              value={patternLabel(profile.pattern)}
              detail={`${profile.gamesWithSplits} games with period splits`}
            />
            <RefDashboardStatCell
              label={`${profile.earlyPeriodLabel} avg`}
              value={profile.earlyAvgPerPeriod.toFixed(1)}
              detail={`${profile.metricLabel} per early window`}
            />
            <RefDashboardStatCell
              label={`${profile.latePeriodLabel} avg`}
              value={profile.lateAvgPerPeriod.toFixed(1)}
              detail={`${formatSigned(profile.lateVsEarlyPct)}% vs early baseline`}
              detailDelta={profile.lateVsEarlyPct}
              sampleGames={profile.gamesWithSplits}
            />
            <RefDashboardStatCell
              label="Period trend slope"
              value={formatSigned(profile.trendSlope, 2)}
              detail="Negative = easing; positive = tightening"
              detailDelta={profile.trendSlope}
              sampleGames={profile.gamesWithSplits}
            />
          </RefDashboardStatGrid>

          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Period whistle sparkline
            </p>
            <p className="mt-1 font-tabular text-xs text-zinc-700">
              {sparkline(profile.periodAverages, profile.periodLabels)}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

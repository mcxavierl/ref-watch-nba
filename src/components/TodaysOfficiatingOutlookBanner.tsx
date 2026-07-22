import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { buildSlateOutlookSummary } from "@/lib/slate-intelligence";

export function TodaysOfficiatingOutlookBanner({
  games,
}: {
  games: OverviewSlateEntry[];
}) {
  const outlook = buildSlateOutlookSummary(games);

  return (
    <div className="slate-outlook-banner" aria-labelledby="slate-outlook-title">
      <p className="slate-outlook-banner__title" id="slate-outlook-title">
        Today&apos;s officiating outlook
      </p>

      <div className="slate-outlook-banner__metrics" aria-label="Slate summary metrics">
        <span>{outlook.gamesMonitored} games monitored</span>
        <span aria-hidden>·</span>
        <span>{outlook.highWhistleCount} high whistle</span>
        <span aria-hidden>·</span>
        <span>{outlook.defensiveCrewCount} defensive crews</span>
        <span aria-hidden>·</span>
        <span>Avg confidence: {outlook.avgConfidencePct}%</span>
      </div>

      {outlook.topSignal ? (
        <p className="slate-outlook-banner__top-signal">
          <span className="slate-outlook-banner__top-label">Top signal:</span>{" "}
          <strong>{outlook.topSignal.matchup}</strong> ({outlook.topSignal.whistleDeltaLabel}{" "}
          whistles · {outlook.topSignal.confidencePct}% confidence ·{" "}
          {outlook.topSignal.starDisplay})
        </p>
      ) : (
        <p className="slate-outlook-banner__top-signal slate-outlook-banner__top-signal--empty">
          Top signal pending as crew assignments and sample gates publish.
        </p>
      )}
    </div>
  );
}

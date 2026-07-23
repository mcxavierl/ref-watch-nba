import type { ReactNode } from "react";
import { Activity, CheckCircle2, Clock, Zap } from "lucide-react";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { buildSlateOutlookSummary } from "@/lib/slate-intelligence";

const BANNER_ICON_SIZE = 14;

function MetricItem({
  icon,
  label,
  iconClassName,
}: {
  icon: ReactNode;
  label: string;
  iconClassName?: string;
}) {
  return (
    <span className="slate-outlook-banner__metric">
      <span className={`slate-outlook-banner__metric-icon ${iconClassName ?? ""}`.trim()}>
        {icon}
      </span>
      <span>{label}</span>
    </span>
  );
}

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
        <MetricItem
          icon={<Activity aria-hidden size={BANNER_ICON_SIZE} strokeWidth={2.25} />}
          label={`${outlook.liveAndAssignedMonitored} live & assigned games monitored`}
          iconClassName="slate-outlook-banner__metric-icon--neutral"
        />
        <MetricItem
          icon={<Clock aria-hidden size={BANNER_ICON_SIZE} strokeWidth={2.25} />}
          label={`${outlook.pendingCrewCount} pending crew assignments`}
          iconClassName="slate-outlook-banner__metric-icon--neutral"
        />
        <MetricItem
          icon={<CheckCircle2 aria-hidden size={BANNER_ICON_SIZE} strokeWidth={2.25} />}
          label={`Avg confidence: ${outlook.avgConfidencePct}% (assigned slate)`}
          iconClassName="slate-outlook-banner__metric-icon--positive"
        />
      </div>

      {outlook.topSignal ? (
        <p className="slate-outlook-banner__top-signal">
          <span className="slate-outlook-banner__top-label">
            <Zap
              aria-hidden
              size={BANNER_ICON_SIZE}
              strokeWidth={2.25}
              className="slate-outlook-banner__top-signal-icon"
            />
            Top signal:
          </span>{" "}
          <strong>{outlook.topSignal.matchup}</strong> ({outlook.topSignal.whistleDeltaLabel}{" "}
          whistles · {outlook.topSignal.confidencePct}% confidence ·{" "}
          {outlook.topSignal.signalTierLabel})
        </p>
      ) : (
        <p className="slate-outlook-banner__top-signal slate-outlook-banner__top-signal--empty">
          Top signal pending as crew assignments and sample gates publish.
        </p>
      )}
    </div>
  );
}

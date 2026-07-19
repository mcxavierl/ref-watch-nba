import {
  formatVariancePercent,
  METRIC_VARIANCE_TONE_CLASS,
  type MetricVarianceTone,
} from "@/lib/metric-variance-display";

export function MetricVarianceDisplay({
  primaryTotal,
  variancePct,
  comparisonCaption = "vs league avg",
  tone,
  size = "lg",
}: {
  primaryTotal: string;
  variancePct: number;
  comparisonCaption?: string;
  tone?: MetricVarianceTone;
  size?: "md" | "lg";
}) {
  const resolvedTone =
    tone ??
    (variancePct > 0 ? "positive" : variancePct < 0 ? "negative" : "neutral");
  const primaryClass =
    size === "lg" ? "metric-variance-primary--lg" : "metric-variance-primary--md";

  return (
    <div className="metric-variance-stack">
      <p className={`metric-variance-primary tabular-nums ${primaryClass}`}>
        {primaryTotal}
      </p>
      <div className="metric-variance-pill bg-slate-800">
        <span
          className={`metric-variance-pill-value tabular-nums ${METRIC_VARIANCE_TONE_CLASS[resolvedTone]}`}
        >
          {formatVariancePercent(variancePct)}
        </span>
      </div>
      <p className="metric-variance-caption">{comparisonCaption}</p>
    </div>
  );
}

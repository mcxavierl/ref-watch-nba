import { DirectionalDeltaValue, deltaToneFromValue } from "@/components/shared/DirectionalDeltaValue";

export type InsightSplitMetric = {
  value: string;
  label: string;
};

type InsightSplitMetricsProps = {
  deltaMetric: InsightSplitMetric;
  compact?: boolean;
};

export function InsightSplitMetrics({
  deltaMetric,
  compact = false,
}: InsightSplitMetricsProps) {
  const deltaTone = deltaToneFromValue(deltaMetric.value);

  return (
    <div
      className={`insight-split-metrics${compact ? " insight-split-metrics--compact" : ""}`}
    >
      <div className="insight-split-metrics-block insight-split-metrics-block--delta">
        <DirectionalDeltaValue
          value={deltaMetric.value}
          tone={deltaTone}
          size={compact ? "md" : "lg"}
        />
        <span className="insight-split-metrics-label">{deltaMetric.label}</span>
      </div>
    </div>
  );
}

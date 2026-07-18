import { DirectionalDeltaValue, deltaToneFromValue } from "@/components/shared/DirectionalDeltaValue";

export type InsightSplitMetric = {
  value: string;
  label: string;
};

type InsightSplitMetricsProps = {
  sampleMetric: InsightSplitMetric;
  deltaMetric: InsightSplitMetric;
  compact?: boolean;
};

export function InsightSplitMetrics({
  sampleMetric,
  deltaMetric,
  compact = false,
}: InsightSplitMetricsProps) {
  const deltaTone = deltaToneFromValue(deltaMetric.value);

  return (
    <div
      className={`insight-split-metrics${compact ? " insight-split-metrics--compact" : ""}`}
    >
      <div className="insight-split-metrics-grid">
        <div className="insight-split-metrics-box insight-split-metrics-box--sample">
          <span className="insight-split-sample-value">{sampleMetric.value}</span>
          <span className="insight-split-metrics-label">{sampleMetric.label}</span>
        </div>
        <div className="insight-split-metrics-box insight-split-metrics-box--delta">
          <DirectionalDeltaValue
            value={deltaMetric.value}
            tone={deltaTone}
            size={compact ? "md" : "lg"}
          />
          <span className="insight-split-metrics-label">{deltaMetric.label}</span>
        </div>
      </div>
    </div>
  );
}

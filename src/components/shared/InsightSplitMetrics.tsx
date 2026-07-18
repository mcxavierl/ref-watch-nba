import { DirectionalDeltaValue, deltaToneFromValue } from "@/components/shared/DirectionalDeltaValue";

export type InsightSplitMetric = {
  value: string;
  label: string;
};

type InsightSplitMetricsProps = {
  sampleMetric: InsightSplitMetric;
  deltaMetric: InsightSplitMetric | null;
  compact?: boolean;
};

export function InsightSplitMetrics({
  sampleMetric,
  deltaMetric,
  compact = false,
}: InsightSplitMetricsProps) {
  const deltaTone = deltaMetric ? deltaToneFromValue(deltaMetric.value) : "neutral";

  return (
    <div
      className={`insight-split-metrics${compact ? " insight-split-metrics--compact" : ""}`}
    >
      {deltaMetric ? (
        <div className="insight-split-metrics-block insight-split-metrics-block--delta">
          <DirectionalDeltaValue
            value={deltaMetric.value}
            tone={deltaTone}
            size={compact ? "md" : "lg"}
          />
          <span className="insight-split-metrics-label">{deltaMetric.label}</span>
        </div>
      ) : null}

      <div className="insight-split-metrics-block insight-split-metrics-block--sample">
        <span className="insight-split-sample-value">{sampleMetric.value}</span>
        <span className="insight-split-metrics-label">{sampleMetric.label}</span>
      </div>
    </div>
  );
}

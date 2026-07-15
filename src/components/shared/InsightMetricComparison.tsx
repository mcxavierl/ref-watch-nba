import type { InsightMetricComparison as InsightMetricComparisonData } from "@/lib/insight-editorial";

type InsightMetricComparisonProps = {
  comparison: InsightMetricComparisonData;
  compact?: boolean;
};

function formatValue(value: number, format: InsightMetricComparisonData["format"]): string {
  if (format === "pct") return `${value.toFixed(1)}%`;
  return value.toFixed(1);
}

function barWidth(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(8, Math.min(100, (value / max) * 100));
}

export function InsightMetricComparison({
  comparison,
  compact = false,
}: InsightMetricComparisonProps) {
  const max = Math.max(comparison.crewValue, comparison.leagueValue, 0.001);

  return (
    <div
      className={`insight-metric-comparison${compact ? " insight-metric-comparison--compact" : ""}`}
      aria-label={`${comparison.crewLabel} compared with ${comparison.leagueLabel}`}
    >
      <div className="insight-metric-comparison-row">
        <span className="insight-metric-comparison-label">{comparison.crewLabel}</span>
        <div className="insight-metric-comparison-track">
          <span
            className="insight-metric-comparison-bar insight-metric-comparison-bar--crew"
            style={{ width: `${barWidth(comparison.crewValue, max)}%` }}
          />
        </div>
        <span className="insight-metric-comparison-value">
          {formatValue(comparison.crewValue, comparison.format)}
        </span>
      </div>
      <div className="insight-metric-comparison-row">
        <span className="insight-metric-comparison-label">{comparison.leagueLabel}</span>
        <div className="insight-metric-comparison-track">
          <span
            className="insight-metric-comparison-bar insight-metric-comparison-bar--league"
            style={{ width: `${barWidth(comparison.leagueValue, max)}%` }}
          />
        </div>
        <span className="insight-metric-comparison-value">
          {formatValue(comparison.leagueValue, comparison.format)}
        </span>
      </div>
    </div>
  );
}

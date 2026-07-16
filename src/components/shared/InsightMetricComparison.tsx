import { adjustedDeltaTooltipText } from "@/lib/data-maturity";
import type { InsightMetricComparison as InsightMetricComparisonData } from "@/lib/insight-editorial";
import type { KpiDataPillTone } from "@/components/ui/KpiDataPill";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";

type InsightMetricComparisonProps = {
  comparison: InsightMetricComparisonData;
  compact?: boolean;
  crewImpactTone?: KpiDataPillTone;
  isAdjusted?: boolean;
};

const DELTA_BAR_SCALE_PP = 60;
const WIN_RATE_BAR_SCALE = 100;

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDecimal(value: number): string {
  return value.toFixed(1);
}

function formatDeltaPp(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}pp`;
}

function deltaBarWidth(deltaPp: number): number {
  const magnitude = Math.abs(deltaPp);
  return Math.max(8, Math.min(100, (magnitude / DELTA_BAR_SCALE_PP) * 100));
}

function rateBarWidth(rate: number): number {
  return Math.max(8, Math.min(100, (rate / WIN_RATE_BAR_SCALE) * 100));
}

function defaultBarWidth(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(8, Math.min(100, (value / max) * 100));
}

function impactToneFromDelta(deltaPp: number): KpiDataPillTone {
  if (deltaPp > 0) return "positive";
  if (deltaPp < 0) return "negative";
  return "neutral";
}

export function InsightMetricComparison({
  comparison,
  compact = false,
  crewImpactTone = "neutral",
  isAdjusted = false,
}: InsightMetricComparisonProps) {
  const isDeltaComparison =
    comparison.deltaPp !== undefined &&
    comparison.refWinRate !== undefined &&
    comparison.teamBaseline !== undefined;

  const deltaTone = isDeltaComparison
    ? impactToneFromDelta(comparison.deltaPp!)
    : crewImpactTone;
  const crewBarTone =
    deltaTone === "positive" || deltaTone === "negative" ? deltaTone : "neutral";

  const max = Math.max(comparison.crewValue, comparison.leagueValue, 0.001);
  const crewBarWidth = isDeltaComparison
    ? deltaBarWidth(comparison.deltaPp!)
    : defaultBarWidth(comparison.crewValue, max);
  const leagueBarWidth = isDeltaComparison
    ? rateBarWidth(comparison.teamBaseline!)
    : defaultBarWidth(comparison.leagueValue, max);

  return (
    <div
      className={`insight-metric-comparison${compact ? " insight-metric-comparison--compact" : ""}`}
      aria-label={`${comparison.crewLabel} compared with ${comparison.leagueLabel}`}
    >
      <div className="insight-metric-comparison-row">
        <span className="insight-metric-comparison-label">{comparison.crewLabel}</span>
        <div className="insight-metric-comparison-track">
          <span
            className={`insight-metric-comparison-bar insight-metric-comparison-bar--crew insight-metric-comparison-bar--${crewBarTone}`}
            style={{ width: `${crewBarWidth}%` }}
          />
        </div>
        {isDeltaComparison ? (
          <div className="insight-metric-comparison-values">
            {isAdjusted ? (
              <MetricInfoHint
                hint={adjustedDeltaTooltipText(comparison.deltaPp!)}
                className="insight-metric-comparison-value insight-metric-comparison-value--delta insight-metric-comparison-value--adjusted"
                panelClassName="insight-metric-comparison-hint-panel"
              >
                <span data-tone={crewBarTone}>{formatDeltaPp(comparison.deltaPp!)}</span>
              </MetricInfoHint>
            ) : (
              <span
                className="insight-metric-comparison-value insight-metric-comparison-value--delta"
                data-tone={crewBarTone}
              >
                {formatDeltaPp(comparison.deltaPp!)}
              </span>
            )}
            <span className="insight-metric-comparison-value insight-metric-comparison-value--rate">
              {formatPct(comparison.refWinRate!)}
            </span>
          </div>
        ) : (
          <span className="insight-metric-comparison-value">
            {comparison.format === "pct"
              ? formatPct(comparison.crewValue)
              : formatDecimal(comparison.crewValue)}
          </span>
        )}
      </div>
      <div className="insight-metric-comparison-row">
        <span className="insight-metric-comparison-label">{comparison.leagueLabel}</span>
        <div className="insight-metric-comparison-track">
          <span
            className="insight-metric-comparison-bar insight-metric-comparison-bar--league"
            style={{ width: `${leagueBarWidth}%` }}
          />
        </div>
        <span className="insight-metric-comparison-value">
          {isDeltaComparison
            ? formatPct(comparison.teamBaseline!)
            : comparison.format === "pct"
              ? formatPct(comparison.leagueValue)
              : formatDecimal(comparison.leagueValue)}
        </span>
      </div>
    </div>
  );
}

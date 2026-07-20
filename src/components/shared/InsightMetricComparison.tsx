import { adjustedDeltaTooltipText } from "@/lib/data-maturity";
import { DirectionalDeltaValue, deltaToneFromValue } from "@/components/shared/DirectionalDeltaValue";
import type { InsightMetricComparison as InsightMetricComparisonData } from "@/lib/insight-editorial";
import type { KpiDataPillTone } from "@/components/ui/KpiDataPill";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";

type InsightMetricComparisonProps = {
  comparison: InsightMetricComparisonData;
  compact?: boolean;
  crewImpactTone?: KpiDataPillTone;
  isAdjusted?: boolean;
  sampleGames?: number;
};

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

function clampPct(value: number): number {
  return Math.max(0, Math.min(WIN_RATE_BAR_SCALE, value));
}

function proportionalBarWidth(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(4, Math.min(100, (value / max) * 100));
}

function impactToneFromDelta(deltaPp: number): KpiDataPillTone {
  if (deltaPp > 0) return "positive";
  if (deltaPp < 0) return "negative";
  return "neutral";
}

function isWinRateDeltaComparison(
  comparison: InsightMetricComparisonData,
): comparison is InsightMetricComparisonData & {
  deltaPp: number;
  teamBaseline: number;
} {
  return comparison.deltaPp !== undefined && comparison.teamBaseline !== undefined;
}

function WinRateDeltaComparison({
  comparison,
  compact,
  isAdjusted,
  sampleGames,
}: {
  comparison: InsightMetricComparisonData & { deltaPp: number; teamBaseline: number };
  compact: boolean;
  isAdjusted: boolean;
  sampleGames: number;
}) {
  const baselinePct = comparison.teamBaseline;
  const deltaPp = comparison.deltaPp;
  const outcomePct = clampPct(
    comparison.refWinRate ?? baselinePct + deltaPp,
  );
  const baselinePos = clampPct(baselinePct);
  const outcomePos = clampPct(outcomePct);
  const gapStart = Math.min(baselinePos, outcomePos);
  const gapWidth = Math.abs(outcomePos - baselinePos);
  const deltaTone = impactToneFromDelta(deltaPp);
  const deltaValue = formatDeltaPp(deltaPp);

  const deltaValueNode =
    isAdjusted && sampleGames > 0 ? (
      <MetricInfoHint
        hint={adjustedDeltaTooltipText(deltaPp, sampleGames)}
        className="insight-metric-comparison-value insight-metric-comparison-value--delta insight-metric-comparison-value--adjusted"
        panelClassName="insight-metric-comparison-hint-panel"
      >
        <DirectionalDeltaValue
          value={deltaValue}
          tone={deltaToneFromValue(deltaValue)}
          size="sm"
        />
      </MetricInfoHint>
    ) : (
      <DirectionalDeltaValue
        value={deltaValue}
        tone={deltaToneFromValue(deltaValue)}
        size="sm"
        className="insight-metric-comparison-value insight-metric-comparison-value--delta"
      />
    );

  return (
    <div
      className={`insight-metric-comparison insight-metric-comparison--win-rate${
        compact ? " insight-metric-comparison--compact" : ""
      }`}
      aria-label={`${comparison.crewLabel} ${deltaValue} compared with ${comparison.leagueLabel} ${formatPct(baselinePct)}`}
    >
      <div className="insight-metric-comparison-grid">
        <span className="insight-metric-comparison-label">{comparison.crewLabel}</span>
        <div
          className="insight-metric-comparison-dual-track"
          role="img"
          aria-hidden
        >
          <div className="insight-metric-comparison-dual-axis">
            {gapWidth > 0 ? (
              <span
                className={`insight-metric-comparison-gap insight-metric-comparison-gap--${deltaTone}`}
                style={{ left: `${gapStart}%`, width: `${gapWidth}%` }}
              />
            ) : null}
            <span
              className="insight-metric-comparison-marker insight-metric-comparison-marker--baseline"
              style={{ left: `${baselinePos}%` }}
            />
            <span
              className={`insight-metric-comparison-marker insight-metric-comparison-marker--outcome insight-metric-comparison-marker--${deltaTone}`}
              style={{ left: `${outcomePos}%` }}
            />
          </div>
        </div>
        <div className="insight-metric-comparison-values">{deltaValueNode}</div>

        <span className="insight-metric-comparison-label">{comparison.leagueLabel}</span>
        <span className="insight-metric-comparison-value insight-metric-comparison-value--rate">
          {formatPct(baselinePct)}
        </span>
      </div>
    </div>
  );
}

function RelativeMetricComparison({
  comparison,
  compact,
  crewImpactTone,
}: {
  comparison: InsightMetricComparisonData;
  compact: boolean;
  crewImpactTone: KpiDataPillTone;
}) {
  const max = Math.max(comparison.crewValue, comparison.leagueValue, 0.001) * 1.05;
  const crewBarWidth = proportionalBarWidth(comparison.crewValue, max);
  const leagueBarWidth = proportionalBarWidth(comparison.leagueValue, max);
  const crewBarTone =
    crewImpactTone === "positive" || crewImpactTone === "negative"
      ? crewImpactTone
      : "neutral";

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
        <span className="insight-metric-comparison-value">
          {comparison.format === "pct"
            ? formatPct(comparison.crewValue)
            : formatDecimal(comparison.crewValue)}
        </span>
      </div>
      <div className="insight-metric-comparison-row">
        <span className="insight-metric-comparison-label">{comparison.leagueLabel}</span>
        <div className="insight-metric-comparison-track">
          <span
            className="insight-metric-comparison-bar insight-metric-comparison-bar--league"
            style={{ width: `${leagueBarWidth}%` }}
          />
        </div>
        <span className="insight-metric-comparison-value insight-metric-comparison-value--rate">
          {comparison.format === "pct"
            ? formatPct(comparison.leagueValue)
            : formatDecimal(comparison.leagueValue)}
        </span>
      </div>
    </div>
  );
}

export function InsightMetricComparison({
  comparison,
  compact = false,
  crewImpactTone = "neutral",
  isAdjusted = false,
  sampleGames = 0,
}: InsightMetricComparisonProps) {
  if (isWinRateDeltaComparison(comparison)) {
    return (
      <WinRateDeltaComparison
        comparison={comparison}
        compact={compact}
        isAdjusted={isAdjusted}
        sampleGames={sampleGames}
      />
    );
  }

  return (
    <RelativeMetricComparison
      comparison={comparison}
      compact={compact}
      crewImpactTone={crewImpactTone}
    />
  );
}

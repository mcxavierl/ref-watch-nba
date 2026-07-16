import type { ReactNode } from "react";
import Link from "next/link";
import type { MatrixExtremeHighlight } from "@/lib/ref-team-matrix";
import {
  formatMatrixHighlightBaseline,
} from "@/lib/ref-team-matrix";
import {
  adjustedDeltaTooltipText,
  displayWinRateDelta,
  formatDeltaPp,
} from "@/lib/data-maturity";
import {
  isDirectionalTone,
  isStandoutTone,
  metricDelightClass,
  matrixExtremeTone,
  type MetricDelightSurface,
  type MetricDelightTone,
} from "@/lib/metric-delight";
import { DataMaturityBar } from "@/components/shared/DataMaturityBar";
import { DataHonestyFootnote } from "@/components/shared/DataHonestyFootnote";
import { PreliminaryDataBadge } from "@/components/shared/PreliminaryDataBadge";
import { formatPct, formatSigned } from "@/lib/stats-utils";

export function StandoutMetricValue({
  children,
  tone = "neutral",
  size = "md",
  className = "",
  title,
}: {
  children: ReactNode;
  tone?: MetricDelightTone;
  size?: "md" | "lg" | "hero";
  className?: string;
  title?: string;
}) {
  const surface: MetricDelightSurface =
    size === "hero" ? "value-hero" : size === "lg" ? "value" : "value";
  const sizeClass =
    size === "hero"
      ? "metric-delight-value--hero-size"
      : size === "lg"
        ? "metric-delight-value--lg-size"
        : "";

  return (
    <span
      className={`${metricDelightClass(tone, surface)} ${sizeClass} ${className}`.trim()}
      title={title}
    >
      {children}
    </span>
  );
}

export function StandoutMetricBadge({
  label,
  value,
  tone = "neutral",
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: MetricDelightTone;
}) {
  return (
    <span className={metricDelightClass(tone, "badge")}>
      <span className="metric-delight-badge-label">{label}</span>
      <span className={metricDelightClass(tone, "badge-value")}>{value}</span>
    </span>
  );
}

export function StandoutMetricBar({
  label,
  magnitude,
  maxMagnitude,
  tone = "neutral",
}: {
  label: ReactNode;
  magnitude: number;
  maxMagnitude: number;
  tone?: MetricDelightTone;
}) {
  const widthPct = Math.min(100, Math.round((magnitude / maxMagnitude) * 100));

  return (
    <div className={metricDelightClass(tone, "bar")}>
      <span className="metric-delight-bar-label">{label}</span>
      <span className="metric-delight-bar-track" aria-hidden>
        <span
          className={metricDelightClass(tone, "bar-fill")}
          style={{ width: `${widthPct}%` }}
        />
      </span>
    </div>
  );
}

export function StandoutFlag({
  children = "Standout",
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`${metricDelightClass("neutral", "flag")} ${className}`.trim()}>
      {children}
    </span>
  );
}

export function StandoutDelta({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "positive" | "negative" | "neutral";
}) {
  if (tone === "neutral") return <>{children}</>;
  return (
    <span className={metricDelightClass(tone, "delta")}>{children}</span>
  );
}

/**
 * CLINICAL MODERN STANDARD: High-accuracy data visualization. All volatility-prone
 * metrics must display maturity indicators and adjusted projections.
 */

export function MatrixExtremeSplitCards({
  extremes,
  basePath,
  entityLabel = "ref",
}: {
  extremes: MatrixExtremeHighlight[];
  basePath: string;
  entityLabel?: "ref" | "official";
}) {
  if (extremes.length === 0) return null;

  const withLabel = entityLabel === "official" ? "official" : "ref";

  return (
    <ul className="metric-delight-extreme-grid">
      {extremes.map((item) => {
        const tone = matrixExtremeTone(item.kind);
        const kicker =
          item.kind === "high" ? "Above baseline" : "Below baseline";
        const deltaDisplay = displayWinRateDelta(item.deltaPts, item.games);
        const heroDelta = deltaDisplay.isAdjusted
          ? formatDeltaPp(deltaDisplay.displayDelta)
          : formatSigned(item.deltaPts);

        return (
          <li
            key={`${item.refSlug}-${item.teamAbbr}`}
            className={metricDelightClass(tone, "card")}
          >
            <div className="metric-delight-card-head">
              <span className={metricDelightClass(tone, "kicker")}>{kicker}</span>
              {deltaDisplay.isPreliminary ? (
                <PreliminaryDataBadge compact className="metric-delight-preliminary-badge" />
              ) : null}
              <StandoutMetricValue
                tone={tone}
                size="hero"
                className={deltaDisplay.isAdjusted ? "metric-delight-value--adjusted" : ""}
                title={
                  deltaDisplay.isAdjusted
                    ? adjustedDeltaTooltipText(deltaDisplay.displayDelta)
                    : undefined
                }
              >
                {heroDelta}
              </StandoutMetricValue>
            </div>
            <p className="metric-delight-card-body">
              <Link
                href={`${basePath}/refs/${item.refSlug}#close-game`}
                className="metric-delight-card-link"
              >
                {item.refName}
              </Link>{" "}
              with{" "}
              <Link
                href={`${basePath}/teams/${item.teamAbbr}`}
                className="metric-delight-card-link"
              >
                {item.teamLabel}
              </Link>
              : {withLabel}×team {item.wins}-{item.losses} ({formatPct(item.winRate)})
              in {item.games} games vs team sample baseline{" "}
              {formatMatrixHighlightBaseline(item)}.
            </p>
            <DataMaturityBar sampleSize={item.games} compact className="metric-delight-maturity" />
            {deltaDisplay.isAdjusted ? (
              <DataHonestyFootnote className="metric-delight-honesty-footnote" />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function delightValueSize(
  tone: MetricDelightTone,
  index: number,
): "hero" | "lg" | "md" {
  if (isStandoutTone(tone) || (isDirectionalTone(tone) && index === 0)) {
    return isStandoutTone(tone) ? "hero" : "lg";
  }
  return isDirectionalTone(tone) ? "lg" : "md";
}

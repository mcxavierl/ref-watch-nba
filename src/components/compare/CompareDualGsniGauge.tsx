import { formatGsniScoreValue } from "@/lib/gsni-ui";

const GAUGE_MIN = -3;
const GAUGE_MAX = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function markerPercent(score: number): number {
  const clamped = clamp(score, GAUGE_MIN, GAUGE_MAX);
  return ((clamped - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100;
}

type CompareDualGsniGaugeProps = {
  scoreA: number | null | undefined;
  scoreB: number | null | undefined;
  labelA?: string;
  labelB?: string;
  className?: string;
};

/** Shared Game-State Index axis with Official A and Official B whistle-bias markers. */
export function CompareDualGsniGauge({
  scoreA,
  scoreB,
  labelA = "Official A",
  labelB = "Official B",
  className = "",
}: CompareDualGsniGaugeProps) {
  const hasA = scoreA !== null && scoreA !== undefined && Number.isFinite(scoreA);
  const hasB = scoreB !== null && scoreB !== undefined && Number.isFinite(scoreB);

  return (
    <div className={`ref-compare-dual-gsni ${className}`.trim()}>
      <div
        className="ref-compare-dual-gsni-track"
        role="img"
        aria-label={`Game-State Index comparison. ${labelA}: ${hasA ? formatGsniScoreValue(scoreA!) : "unavailable"}. ${labelB}: ${hasB ? formatGsniScoreValue(scoreB!) : "unavailable"}.`}
      >
        <div className="ref-compare-dual-gsni-rail" aria-hidden>
          <div className="ref-compare-dual-gsni-center" />
          {hasA ? (
            <div
              className="ref-compare-dual-gsni-marker ref-compare-dual-gsni-marker--a"
              style={{ left: `${markerPercent(scoreA!)}%` }}
            />
          ) : null}
          {hasB ? (
            <div
              className="ref-compare-dual-gsni-marker ref-compare-dual-gsni-marker--b"
              style={{ left: `${markerPercent(scoreB!)}%` }}
            />
          ) : null}
        </div>
        <div className="ref-compare-dual-gsni-axis" aria-hidden>
          <span>-3</span>
          <span>0</span>
          <span>+3</span>
        </div>
      </div>
      <div className="ref-compare-dual-gsni-legend">
        <span className="ref-compare-dual-gsni-legend-item ref-compare-dual-gsni-legend-item--a">
          {labelA}
          {hasA ? `: ${formatGsniScoreValue(scoreA!)}` : ""}
        </span>
        <span className="ref-compare-dual-gsni-legend-item ref-compare-dual-gsni-legend-item--b">
          {labelB}
          {hasB ? `: ${formatGsniScoreValue(scoreB!)}` : ""}
        </span>
      </div>
    </div>
  );
}

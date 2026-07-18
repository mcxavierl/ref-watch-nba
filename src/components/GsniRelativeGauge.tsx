import { formatGsni } from "@/lib/gsni-display";

/** Horizontal league-baseline gauge: low GSNI (heavy whistle) left, high GSNI (quiet) right. */
export function GsniRelativeGauge({
  gsni,
  className = "",
}: {
  gsni: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, gsni));
  const markerLeft = `${clamped}%`;

  return (
    <div
      className={`gsni-relative-gauge ${className}`.trim()}
      role="img"
      aria-label={`GSNI ${formatGsni(clamped)} on a 0 to 100 scale where 50 is league neutral.`}
    >
      <div className="gsni-relative-gauge-track" aria-hidden>
        <div className="gsni-relative-gauge-baseline" />
        <div
          className="gsni-relative-gauge-marker"
          style={{ left: markerLeft }}
        >
          <span className="gsni-relative-gauge-marker-value">{formatGsni(clamped)}</span>
        </div>
      </div>
      <div className="gsni-relative-gauge-labels" aria-hidden>
        <span className="gsni-relative-gauge-label">High Whistle Frequency</span>
        <span className="gsni-relative-gauge-label gsni-relative-gauge-label--center">
          League Baseline
        </span>
        <span className="gsni-relative-gauge-label gsni-relative-gauge-label--end">
          Low Whistle Frequency
        </span>
      </div>
      <p className="gsni-relative-gauge-hint">
        Low GSNI left, high GSNI right. 50 is league-neutral in matched clutch states.
      </p>
    </div>
  );
}

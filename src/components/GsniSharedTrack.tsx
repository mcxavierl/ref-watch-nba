import {
  formatGsniIndexScore,
  formatGsniScoreValue,
  GSNI_NEUTRAL_BASELINE,
  GSNI_Z_TRACK_MAX,
  gsniDeltaFromNeutral,
} from "@/lib/gsni-ui";

type GsniSharedTrackProps = {
  mode: "score" | "progress";
  /** Game-State Index score for score mode, or collected minutes for progress mode. */
  value: number;
  /** Gate maximum for progress mode. */
  gate?: number;
  baseline?: number;
  max?: number;
  showValue?: boolean;
  showCenterLabel?: boolean;
  className?: string;
  ariaLabel?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function GsniSharedTrack({
  mode,
  value,
  gate = 50,
  baseline = GSNI_NEUTRAL_BASELINE,
  max = GSNI_Z_TRACK_MAX,
  showValue = true,
  showCenterLabel = false,
  className = "",
  ariaLabel,
}: GsniSharedTrackProps) {
  if (mode === "progress") {
    const collected = clamp(value, 0, gate);
    const markerPercent = gate > 0 ? (collected / gate) * 100 : 0;

    return (
      <div
        className={`gsni-shared-track gsni-shared-track--progress ${className}`.trim()}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={gate}
        aria-valuenow={collected}
        aria-label={
          ariaLabel ?? `${collected} of ${gate} high-leverage minutes collected`
        }
      >
        <div className="gsni-shared-track-rail" aria-hidden>
          <div
            className="gsni-shared-track-fill gsni-shared-track-fill--progress"
            style={{ width: `${markerPercent}%` }}
          />
          <div className="gsni-shared-track-baseline gsni-shared-track-baseline--gate" />
          <div
            className="gsni-shared-track-marker gsni-shared-track-marker--progress"
            style={{ left: `${markerPercent}%` }}
          />
        </div>
      </div>
    );
  }

  const span = max * 2;
  const clamped = clamp(value, -max, max);
  const baselinePercent = ((baseline + max) / span) * 100;
  const markerPercent = ((clamped + max) / span) * 100;
  const delta = gsniDeltaFromNeutral(clamped);
  const spanStart = Math.min(baselinePercent, markerPercent);
  const spanWidth = Math.abs(markerPercent - baselinePercent);
  const deltaTone = delta >= 0 ? "positive" : "negative";

  return (
    <div
      className={`gsni-shared-track gsni-shared-track--score ${className}`.trim()}
      role="img"
      aria-label={
        ariaLabel ??
        `${formatGsniIndexScore(clamped)} vs league average. ${formatGsniScoreValue(clamped)} on the Game-State Index scale.`
      }
    >
      <div className="gsni-shared-track-meta">
        {showValue ? (
          <span className="gsni-shared-track-score tabular-nums text-white font-semibold">
            {formatGsniIndexScore(clamped)}
          </span>
        ) : null}
      </div>
      <div className="gsni-shared-track-rail" aria-hidden>
        {spanWidth > 0 ? (
          <div
            className={`gsni-shared-track-span gsni-shared-track-span--${deltaTone}`}
            style={{ left: `${spanStart}%`, width: `${spanWidth}%` }}
          />
        ) : null}
        <div
          className="gsni-shared-track-baseline"
          style={{ left: `${baselinePercent}%` }}
        />
        <div
          className="gsni-shared-track-marker"
          style={{ left: `${markerPercent}%` }}
        />
      </div>
      {showCenterLabel ? (
        <div className="gsni-shared-track-axis" aria-hidden>
          <span className="gsni-shared-track-axis-label gsni-shared-track-axis-label--start">
            -{max.toFixed(1)}
          </span>
          <span className="gsni-shared-track-axis-label gsni-shared-track-axis-label--center">
            0.0
          </span>
          <span className="gsni-shared-track-axis-label gsni-shared-track-axis-label--end">
            +{max.toFixed(1)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

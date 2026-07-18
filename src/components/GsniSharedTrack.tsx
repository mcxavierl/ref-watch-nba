import { formatGsni } from "@/lib/gsni-display";
import {
  GSNI_NEUTRAL_BASELINE,
  gsniDeltaFromNeutral,
} from "@/lib/gsni-ui";
import { GsniDeltaValue } from "@/components/GsniDeltaValue";

type GsniSharedTrackProps = {
  mode: "score" | "progress";
  /** GSNI score (0-100) for score mode, or collected minutes for progress mode. */
  value: number;
  /** Gate maximum for progress mode. */
  gate?: number;
  baseline?: number;
  max?: number;
  showDelta?: boolean;
  showValue?: boolean;
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
  max = 100,
  showDelta = true,
  showValue = true,
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

  const clamped = clamp(value, 0, max);
  const baselinePercent = (baseline / max) * 100;
  const markerPercent = (clamped / max) * 100;
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
        `GSNI ${formatGsni(clamped)} on a 0 to 100 scale where ${baseline} is league neutral.`
      }
    >
      <div className="gsni-shared-track-meta">
        {showValue ? (
          <span className="gsni-shared-track-score tabular-nums text-white font-semibold">
            {formatGsni(clamped)}
          </span>
        ) : null}
        {showDelta && delta !== 0 ? <GsniDeltaValue delta={delta} /> : null}
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
    </div>
  );
}

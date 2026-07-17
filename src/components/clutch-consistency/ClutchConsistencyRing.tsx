import {
  CLUTCH_CONSISTENCY_SCALE,
  formatConsistencyIndex,
} from "@/lib/clutch-consistency-index";
import type { ConsistencyProfile } from "@/lib/clutch-consistency-index";

type ClutchConsistencyRingProps = {
  index: number;
  profile: ConsistencyProfile;
};

const RADIUS = 34;
const STROKE = 6;
const SIZE = (RADIUS + STROKE) * 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ringTone(profile: ConsistencyProfile): string {
  if (profile === "high-consistency") return "cci-ring--consistency";
  if (profile === "high-variance") return "cci-ring--variance";
  return "cci-ring--moderate";
}

export function ClutchConsistencyRing({ index, profile }: ClutchConsistencyRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(index)));
  const dashOffset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <div
      className={`cci-ring ${ringTone(profile)}`}
      role="img"
      aria-label={`${formatConsistencyIndex(clamped)} out of 100 on the Clutch Consistency Index.`}
    >
      <svg
        className="cci-ring__svg"
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden
      >
        <circle
          className="cci-ring__track"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
        />
        <circle
          className="cci-ring__value"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div className="cci-ring__center">
        <span className="cci-ring__score">{formatConsistencyIndex(clamped)}</span>
        <span className="cci-ring__denom">/100</span>
      </div>
      <div className="cci-ring__scale" aria-hidden>
        <span>0 · {CLUTCH_CONSISTENCY_SCALE.variance}</span>
        <span>100 · {CLUTCH_CONSISTENCY_SCALE.consistency}</span>
      </div>
    </div>
  );
}

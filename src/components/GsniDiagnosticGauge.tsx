import { formatGsniScoreValue } from "@/lib/gsni-ui";

const GAUGE_MIN = -3;
const GAUGE_MAX = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

type GsniDiagnosticGaugeProps = {
  score: number;
  className?: string;
};

/** Full-width 4px diagnostic gauge with a 0.0 center tick and score dot on [-3, +3]. */
export function GsniDiagnosticGauge({
  score,
  className = "",
}: GsniDiagnosticGaugeProps) {
  const clamped = clamp(score, GAUGE_MIN, GAUGE_MAX);
  const dotPercent = ((clamped - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100;
  const dotColor = score >= 0 ? "bg-emerald-500" : "bg-rose-500";

  return (
    <div
      className={`gsni-diagnostic-gauge relative w-full min-w-0 ${className}`.trim()}
      role="img"
      aria-label={`Game-State Index ${formatGsniScoreValue(score)} on a scale from ${GAUGE_MIN} to ${GAUGE_MAX}.`}
    >
      <div className="relative h-1 w-full rounded-full bg-slate-800" aria-hidden>
        <div className="absolute left-1/2 top-1/2 z-[1] h-2 w-px -translate-x-1/2 -translate-y-1/2 bg-slate-500" />
        <div
          className={`absolute top-1/2 z-[2] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${dotColor}`}
          style={{ left: `${dotPercent}%` }}
        />
      </div>
    </div>
  );
}

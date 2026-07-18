import { Radar } from "lucide-react";

export function GsniSoftLockCard({
  minutes,
  gate,
}: {
  minutes: number;
  gate: number;
}) {
  const collected = Math.round(minutes * 10) / 10;
  const progress = Math.min(100, (minutes / gate) * 100);

  return (
    <div className="gsni-soft-lock-card">
      <div className="gsni-soft-lock-card-head">
        <Radar className="gsni-soft-lock-card-icon h-5 w-5 shrink-0 text-indigo-400" strokeWidth={2.1} aria-hidden />
        <p className="gsni-soft-lock-card-copy">
          Building the profile...{" "}
          <span className="tabular-nums text-indigo-300">{collected}</span> / {gate}{" "}
          high-leverage minutes collected.
        </p>
      </div>
      <div
        className="gsni-soft-lock-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={gate}
        aria-valuenow={Math.min(gate, collected)}
        aria-label={`${collected} of ${gate} high-leverage minutes collected`}
      >
        <div
          className="gsni-soft-lock-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

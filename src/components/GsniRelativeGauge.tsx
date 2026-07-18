import { GsniSharedTrack } from "@/components/GsniSharedTrack";

/** Horizontal league-baseline gauge using the shared GSNI track. */
export function GsniRelativeGauge({
  gsni,
  className = "",
}: {
  gsni: number;
  className?: string;
}) {
  return (
    <div className={`gsni-relative-gauge ${className}`.trim()}>
      <GsniSharedTrack mode="score" value={gsni} />
      <div className="gsni-relative-gauge-labels" aria-hidden>
        <span className="gsni-relative-gauge-label">High whistle</span>
        <span className="gsni-relative-gauge-label gsni-relative-gauge-label--center">
          League baseline
        </span>
        <span className="gsni-relative-gauge-label gsni-relative-gauge-label--end">
          Low whistle
        </span>
      </div>
      <p className="gsni-sub-text">
        Clutch-state variance vs league peers in matched score-and-clock situations.
      </p>
    </div>
  );
}

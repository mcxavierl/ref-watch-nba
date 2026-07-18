import { GsniBandBadge } from "@/components/GsniBandBadge";
import { GsniDeltaValue } from "@/components/GsniDeltaValue";
import { GsniSharedTrack } from "@/components/GsniSharedTrack";
import { explainGsni } from "@/lib/gsni-display";

/** Horizontal league-baseline gauge using the shared GSNI track. */
export function GsniRelativeGauge({
  gsni,
  className = "",
}: {
  gsni: number;
  className?: string;
}) {
  const explanation = explainGsni(gsni);

  return (
    <div className={`gsni-relative-gauge ${className}`.trim()}>
      <div className="gsni-relative-gauge-head">
        <GsniBandBadge band={explanation.band} />
        <p className="gsni-relative-gauge-headline">{explanation.headline}</p>
        <div className="gsni-relative-gauge-compare">
          <GsniDeltaValue delta={explanation.vsLeaguePoints} />
          <span className="gsni-sub-text">vs league baseline (50)</span>
        </div>
      </div>
      <GsniSharedTrack mode="score" value={gsni} showValue={false} />
      <div className="gsni-relative-gauge-labels" aria-hidden>
        <span className="gsni-relative-gauge-label">Heavy (more flags)</span>
        <span className="gsni-relative-gauge-label gsni-relative-gauge-label--center">
          League avg · 50
        </span>
        <span className="gsni-relative-gauge-label gsni-relative-gauge-label--end">
          Quiet (fewer flags)
        </span>
      </div>
      <p className="gsni-sub-text">{explanation.comparisonLine}</p>
      <p className="gsni-sub-text">{explanation.methodLine}</p>
      <p className="gsni-sub-text gsni-scale-legend">{explanation.scaleLine}</p>
    </div>
  );
}

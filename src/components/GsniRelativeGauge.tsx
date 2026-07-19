import { GsniBandBadge } from "@/components/GsniBandBadge";
import { GsniSharedTrack } from "@/components/GsniSharedTrack";
import { explainGsni } from "@/lib/gsni-display";
import { formatGsniIndexScore } from "@/lib/gsni-ui";

/** Horizontal league-baseline gauge using the shared Game-State Index track. */
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
        <GsniBandBadge band={explanation.band} zScore={gsni} />
        <p className="gsni-relative-gauge-headline">{explanation.headline}</p>
        <div className="gsni-relative-gauge-compare">
          <span className="gsni-sub-text font-medium text-white">
            {formatGsniIndexScore(explanation.zScore)}
          </span>
          <span className="gsni-sub-text">vs league average</span>
        </div>
      </div>
      <GsniSharedTrack mode="score" value={gsni} showValue={false} />
      <div className="gsni-relative-gauge-labels" aria-hidden>
        <span className="gsni-relative-gauge-label">Above-Average Frequency</span>
        <span className="gsni-relative-gauge-label gsni-relative-gauge-label--center">
          League Average
        </span>
        <span className="gsni-relative-gauge-label gsni-relative-gauge-label--end">
          Below-Average Frequency
        </span>
      </div>
      <p className="gsni-sub-text">{explanation.comparisonLine}</p>
      <p className="gsni-sub-text">{explanation.methodLine}</p>
      <p className="gsni-sub-text gsni-scale-legend">{explanation.scaleLine}</p>
    </div>
  );
}

export { formatGsniIndexScore as formatGsniZ };

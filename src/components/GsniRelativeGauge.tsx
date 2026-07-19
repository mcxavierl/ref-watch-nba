import { GsniBandBadge } from "@/components/GsniBandBadge";
import { GsniScoreBlock } from "@/components/GsniScoreBlock";
import { explainGsni } from "@/lib/gsni-display";

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
      </div>
      <GsniScoreBlock score={gsni} />
      <p className="gsni-sub-text">{explanation.methodLine}</p>
    </div>
  );
}

export { formatGsniIndexScore as formatGsniZ } from "@/lib/gsni-ui";

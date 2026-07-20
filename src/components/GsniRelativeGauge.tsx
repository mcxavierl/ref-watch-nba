import { GsniCorrelationPill } from "@/components/GsniCorrelationPill";
import { GsniScoreBlock } from "@/components/GsniScoreBlock";

/** Horizontal league-baseline gauge using the diagnostic Game-State Index track. */
export function GsniRelativeGauge({
  gsni,
  className = "",
}: {
  gsni: number;
  className?: string;
}) {
  return (
    <div className={`gsni-relative-gauge ${className}`.trim()}>
      <div className="gsni-relative-gauge-head">
        <GsniCorrelationPill score={gsni} />
      </div>
      <GsniScoreBlock score={gsni} showPill={false} />
    </div>
  );
}

export { formatGsniIndexScore as formatGsniZ } from "@/lib/gsni-ui";

import { GsniBandBadge } from "@/components/GsniBandBadge";
import { GsniCard } from "@/components/GsniCard";
import { GsniDeltaValue } from "@/components/GsniDeltaValue";
import { GsniSharedTrack } from "@/components/GsniSharedTrack";
import { explainGsni } from "@/lib/gsni-display";
import { formatGsniZ } from "@/lib/gsni-ui";

type GsniGaugeProps = {
  index: number;
  size?: "sm" | "md" | "lg";
  showCaption?: boolean;
  className?: string;
};

export function GsniGauge({
  index,
  size = "md",
  showCaption = true,
  className = "",
}: GsniGaugeProps) {
  const explanation = explainGsni(index);

  const paddingClass =
    size === "lg" ? "p-4" : size === "sm" ? "p-2.5" : "p-3";

  return (
    <GsniCard className={`gsni-gauge ${paddingClass} ${className}`.trim()}>
      <div className="gsni-gauge-head">
        <p className="gsni-gauge-label">Clutch whistle tendency</p>
        <GsniBandBadge
          band={explanation.band}
          extreme={explanation.qualitativeLabel.startsWith("Extreme")}
        />
      </div>
      <div className="gsni-gauge-score tabular-nums text-xl font-semibold text-white">
        {formatGsniZ(index)}
      </div>
      <div className="gsni-gauge-compare">
        <GsniDeltaValue delta={explanation.zScore} />
        <span className="gsni-sub-text">vs league (0σ avg)</span>
      </div>
      <GsniSharedTrack
        mode="score"
        value={index}
        showValue={false}
        showDelta={false}
        ariaLabel={`${explanation.qualitativeLabel} clutch tendency at ${formatGsniZ(index)}. ${explanation.headline}.`}
      />
      {showCaption ? (
        <>
          <p className="gsni-sub-text">{explanation.comparisonLine}</p>
          <p className="gsni-sub-text gsni-scale-legend">{explanation.scaleLine}</p>
        </>
      ) : null}
    </GsniCard>
  );
}

import { GsniBandBadge } from "@/components/GsniBandBadge";
import { GsniCard } from "@/components/GsniCard";
import { GsniSharedTrack } from "@/components/GsniSharedTrack";
import { explainGsni } from "@/lib/gsni-display";
import { formatGsniIndexScore } from "@/lib/gsni-ui";

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
        <p className="gsni-gauge-label">High-Leverage Penalty Frequency</p>
        <GsniBandBadge band={explanation.band} zScore={index} />
      </div>
      <div className="gsni-gauge-score tabular-nums text-xl font-semibold text-white">
        {formatGsniIndexScore(index)}
      </div>
      <div className="gsni-gauge-compare">
        <span className="gsni-sub-text">vs league average</span>
      </div>
      <GsniSharedTrack
        mode="score"
        value={index}
        showValue={false}
        ariaLabel={`${explanation.qualitativeLabel} at ${formatGsniIndexScore(index)}. ${explanation.headline}.`}
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

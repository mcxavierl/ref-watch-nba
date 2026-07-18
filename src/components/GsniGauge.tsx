import { GsniBandBadge } from "@/components/GsniBandBadge";
import { GsniCard } from "@/components/GsniCard";
import { GsniDeltaValue } from "@/components/GsniDeltaValue";
import { GsniSharedTrack } from "@/components/GsniSharedTrack";
import { explainGsni } from "@/lib/gsni-display";

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
  const clamped = Math.max(0, Math.min(100, Math.round(index)));
  const explanation = explainGsni(clamped);

  const paddingClass =
    size === "lg" ? "p-4" : size === "sm" ? "p-2.5" : "p-3";

  return (
    <GsniCard className={`gsni-gauge ${paddingClass} ${className}`.trim()}>
      <div className="gsni-gauge-head">
        <p className="gsni-gauge-label">Clutch whistle tendency</p>
        <GsniBandBadge band={explanation.band} />
      </div>
      <div className="gsni-gauge-compare">
        <GsniDeltaValue delta={explanation.vsLeaguePoints} />
        <span className="gsni-sub-text">vs league (50 avg)</span>
      </div>
      <GsniSharedTrack
        mode="score"
        value={clamped}
        showValue={false}
        showDelta={false}
        ariaLabel={`${explanation.bandTitle} clutch tendency, ${formatGsniDeltaLabel(explanation.vsLeaguePoints)}. ${explanation.headline}.`}
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

function formatGsniDeltaLabel(delta: number): string {
  if (delta === 0) return "matches league average";
  return `${Math.abs(delta)} points ${delta > 0 ? "quieter" : "heavier"} than league`;
}

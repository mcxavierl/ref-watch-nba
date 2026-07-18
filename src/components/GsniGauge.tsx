import { formatGsni, gsniCaption } from "@/lib/gsni-display";
import { GsniCard } from "@/components/GsniCard";
import { GsniSharedTrack } from "@/components/GsniSharedTrack";

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

  const paddingClass =
    size === "lg" ? "p-4" : size === "sm" ? "p-2.5" : "p-3";

  return (
    <GsniCard className={`gsni-gauge ${paddingClass} ${className}`.trim()}>
      <p className="gsni-gauge-label">Game-State Index</p>
      <GsniSharedTrack
        mode="score"
        value={clamped}
        showValue
        showDelta
        ariaLabel={`Game-State Index ${formatGsni(clamped)} out of 100. ${gsniCaption(clamped)}.`}
      />
      {showCaption ? (
        <p className="gsni-sub-text">{gsniCaption(clamped)}</p>
      ) : null}
    </GsniCard>
  );
}

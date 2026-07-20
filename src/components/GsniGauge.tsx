import { GsniCorrelationPill } from "@/components/GsniCorrelationPill";
import { GsniCard } from "@/components/GsniCard";
import { GsniScoreBlock } from "@/components/GsniScoreBlock";

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
  const paddingClass =
    size === "lg" ? "p-4" : size === "sm" ? "p-2.5" : "p-3";

  return (
    <GsniCard className={`gsni-gauge ${paddingClass} ${className}`.trim()}>
      <div className="gsni-gauge-head">
        <p className="gsni-gauge-label">High-Leverage Penalty Frequency</p>
        <GsniCorrelationPill score={index} />
      </div>
      <GsniScoreBlock
        score={index}
        compact={size === "sm"}
        showPill={false}
        className={showCaption ? undefined : "gsni-score-block--no-summary"}
      />
    </GsniCard>
  );
}

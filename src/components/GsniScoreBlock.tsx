import { GsniSharedTrack } from "@/components/GsniSharedTrack";
import { explainGsni } from "@/lib/gsni-display";
import { formatGsniScoreValue, GSNI_SCALE_LEGEND } from "@/lib/gsni-ui";

type GsniScoreBlockProps = {
  score: number;
  className?: string;
  compact?: boolean;
};

/** Score value, scale legend, anchored gauge, and insight summary. */
export function GsniScoreBlock({
  score,
  className = "",
  compact = false,
}: GsniScoreBlockProps) {
  const explanation = explainGsni(score);

  return (
    <div className={`gsni-score-block ${compact ? "gsni-score-block--compact" : ""} ${className}`.trim()}>
      <div className="gsni-score-block-value-wrap">
        <p className="gsni-gauge-label">Index Score</p>
        <p className="gsni-score-value tabular-nums">{formatGsniScoreValue(score)}</p>
        <p className="gsni-scale-hint">{GSNI_SCALE_LEGEND}</p>
      </div>
      <GsniSharedTrack
        mode="score"
        value={score}
        showValue={false}
        showCenterLabel
        className={compact ? "gsni-shared-track--compact" : undefined}
        ariaLabel={`${explanation.categoryLabel} at ${formatGsniScoreValue(score)}. ${explanation.insightSummary}`}
      />
      <p className="gsni-insight-summary">{explanation.insightSummary}</p>
    </div>
  );
}

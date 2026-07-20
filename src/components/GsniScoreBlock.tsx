import { GsniCorrelationPill } from "@/components/GsniCorrelationPill";
import { GsniDiagnosticGauge } from "@/components/GsniDiagnosticGauge";
import { gsniDiagnosticHeader } from "@/lib/gsni-display";
import { GSNI_SCALE_LEGEND } from "@/lib/gsni-ui";

type GsniScoreBlockProps = {
  score: number;
  className?: string;
  compact?: boolean;
  /** Hide the correlation pill when the header already carries the label. */
  showPill?: boolean;
};

/** Diagnostic score header, scale context, gauge, and optional correlation pill. */
export function GsniScoreBlock({
  score,
  className = "",
  compact = false,
  showPill = true,
}: GsniScoreBlockProps) {
  const header = gsniDiagnosticHeader(score);

  return (
    <div className={`gsni-score-block ${compact ? "gsni-score-block--compact" : ""} ${className}`.trim()}>
      <div className="gsni-score-block-value-wrap">
        <p className={`gsni-score-headline tabular-nums font-semibold ${compact ? "text-base" : "text-lg"}`}>
          {header}
        </p>
        <p className="gsni-scale-hint">{GSNI_SCALE_LEGEND}</p>
      </div>
      <GsniDiagnosticGauge score={score} />
      {showPill ? <GsniCorrelationPill score={score} /> : null}
    </div>
  );
}

import {
  dataMaturityTier,
  dataMaturityTierClass,
  dataMaturityTierShortLabel,
} from "@/lib/data-maturity";

type InsightDataMaturityBarProps = {
  score: number;
  compact?: boolean;
};

export function InsightDataMaturityBar({
  score,
  compact = false,
}: InsightDataMaturityBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tier = dataMaturityTier(clamped);

  return (
    <div
      className={`insight-data-maturity insight-confidence${compact ? " insight-confidence--compact" : ""}`}
      aria-label={`${clamped}% data maturity, ${tier}`}
    >
      <div className="insight-confidence-header">
        <span className="insight-confidence-label">Data maturity</span>
        <span className="insight-confidence-value">
          <span className={dataMaturityTierClass(tier)}>
            {dataMaturityTierShortLabel(tier)}
          </span>
          <span className="insight-data-maturity-pct">{clamped}%</span>
        </span>
      </div>
      <div className="insight-confidence-track" role="presentation">
        <span
          className={`insight-confidence-fill insight-data-maturity-fill insight-data-maturity-fill--${tier === "Low Maturity" ? "low" : tier === "Moderate Maturity" ? "moderate" : "high"}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/** @deprecated Use InsightDataMaturityBar */
export function InsightConfidenceBar(props: InsightDataMaturityBarProps) {
  return <InsightDataMaturityBar {...props} />;
}

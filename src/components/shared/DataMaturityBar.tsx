import {
  dataMaturityPercent,
  dataMaturityTier,
  dataMaturityTierClass,
  dataMaturityTierShortLabel,
} from "@/lib/data-maturity";

type DataMaturityBarProps = {
  sampleSize: number;
  compact?: boolean;
  className?: string;
};

export function DataMaturityBar({
  sampleSize,
  compact = false,
  className = "",
}: DataMaturityBarProps) {
  const percent = dataMaturityPercent(sampleSize);
  const tier = dataMaturityTier(percent);

  return (
    <div
      className={`data-maturity-bar insight-data-maturity insight-confidence${
        compact ? " insight-confidence--compact" : ""
      }${className ? ` ${className}` : ""}`.trim()}
      aria-label={`${percent}% data maturity, ${tier}`}
    >
      <div className="insight-confidence-header">
        <span className="insight-confidence-label">Data maturity</span>
        <span className="insight-confidence-value">
          <span className={dataMaturityTierClass(tier)}>
            {dataMaturityTierShortLabel(tier)}
          </span>
          <span className="insight-data-maturity-pct tabular-nums">{percent}%</span>
        </span>
      </div>
      <div className="insight-confidence-track" role="presentation">
        <span
          className={`insight-confidence-fill insight-data-maturity-fill insight-data-maturity-fill--${
            tier === "Low Maturity"
              ? "low"
              : tier === "Moderate Maturity"
                ? "moderate"
                : "high"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

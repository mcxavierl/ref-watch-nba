type InsightConfidenceBarProps = {
  score: number;
  compact?: boolean;
};

export function InsightConfidenceBar({ score, compact = false }: InsightConfidenceBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div
      className={`insight-confidence${compact ? " insight-confidence--compact" : ""}`}
      aria-label={`${clamped}% confidence`}
    >
      <div className="insight-confidence-header">
        <span className="insight-confidence-label">Confidence</span>
        <span className="insight-confidence-value">{clamped}%</span>
      </div>
      <div className="insight-confidence-track" role="presentation">
        <span
          className="insight-confidence-fill"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

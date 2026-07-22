import type { DatasetMoatMetric } from "@/lib/homepage-dual-narrative";

type GoldMineProofBarProps = {
  metrics: DatasetMoatMetric[];
};

export function GoldMineProofBar({ metrics }: GoldMineProofBarProps) {
  if (metrics.length === 0) return null;

  return (
    <div className="gold-mine-proof-bar" aria-label="Dataset coverage metrics">
      <div className="gold-mine-proof-bar-inner">
        {metrics.map((metric, index) => (
          <span key={metric.id} className="gold-mine-proof-bar-item text-xs text-slate-400">
            <span className="gold-mine-proof-bar-value">{metric.value}</span> {metric.label}
            {index < metrics.length - 1 ? (
              <span className="gold-mine-proof-bar-sep" aria-hidden>
                |
              </span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

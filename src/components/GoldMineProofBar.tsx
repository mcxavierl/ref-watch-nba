import type { DatasetMoatMetric } from "@/lib/homepage-dual-narrative";

type GoldMineProofBarProps = {
  metrics: DatasetMoatMetric[];
};

export function GoldMineProofBar({ metrics }: GoldMineProofBarProps) {
  if (metrics.length === 0) return null;

  return (
    <div
      className="gold-mine-proof-bar grid grid-cols-2 gap-4 border-y border-slate-800/60 py-4 text-center md:grid-cols-4"
      aria-label="Dataset coverage metrics"
    >
      {metrics.map((metric) => (
        <div key={metric.id} className="gold-mine-proof-bar-metric">
          <p className="gold-mine-proof-bar-value text-lg font-semibold tabular-nums text-slate-100">
            {metric.value}
          </p>
          <p className="gold-mine-proof-bar-label text-xs text-slate-400">{metric.label}</p>
        </div>
      ))}
    </div>
  );
}

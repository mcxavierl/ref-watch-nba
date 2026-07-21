import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { buildHomepageProofMetrics } from "@/lib/homepage-intelligence";

type GoldMineProofBarProps = {
  data: CrossLeagueOverview;
};

export function GoldMineProofBar({ data }: GoldMineProofBarProps) {
  const metrics = buildHomepageProofMetrics(data);

  return (
    <div
      className="gold-mine-proof-bar bg-slate-900/80 border-y border-slate-800 text-xs text-slate-300 py-3 font-mono"
      role="region"
      aria-label="Platform proof metrics"
    >
      <div className="gold-mine-proof-bar-inner">
        {metrics.map((metric, index) => (
          <span key={metric.id} className="gold-mine-proof-bar-item">
            <span className="gold-mine-proof-bar-value">{metric.value}</span>{" "}
            {metric.label}
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

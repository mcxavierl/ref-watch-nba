import type { DatasetMoatMetric } from "@/lib/homepage-dual-narrative";
import "./homepage-dual-narrative.css";

type TheDatasetMoatProps = {
  metrics: DatasetMoatMetric[];
};

export function TheDatasetMoat({ metrics }: TheDatasetMoatProps) {
  return (
    <section className="dataset-moat section-block" aria-labelledby="dataset-moat-heading">
      <div className="dataset-moat-header">
        <h2 className="dataset-moat-title" id="dataset-moat-heading">
          The Dataset
        </h2>
        <p className="dataset-moat-subtitle">
          RefWatch is building the world&apos;s largest structured intelligence database for
          sports officiating.
        </p>
      </div>

      <div className="dataset-moat-grid">
        {metrics.map((metric) => (
          <article key={metric.id} className="dataset-moat-metric">
            <span className="dataset-moat-metric-value tabular-nums">{metric.value}</span>
            <span className="dataset-moat-metric-label">{metric.label}</span>
          </article>
        ))}
      </div>

      <p className="dataset-moat-ticker" role="status">
        New games processed and recalibrated nightly across 8 behavioral dimensions.
      </p>
    </section>
  );
}

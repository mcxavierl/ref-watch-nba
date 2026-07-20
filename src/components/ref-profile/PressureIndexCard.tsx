import {
  pressureTendencyDisplayLabel,
  type PressureTendencyLabel,
} from "@/lib/analytics/pressure-index";
import "./scouting-report.css";

type PressureIndexCardProps = {
  pressureIndex: number | null;
  pressureTendencyLabel: string;
  baselineWhistleRate: number | null;
  pressureWhistleRate: number | null;
};

function gaugePosition(pressureIndex: number | null): string {
  if (pressureIndex === null) return "50%";
  const clamped = Math.max(70, Math.min(130, pressureIndex));
  const pct = ((clamped - 70) / 60) * 84 + 8;
  return `${Math.max(8, Math.min(92, pct))}%`;
}

function badgeClass(label: string): string {
  if (label === "tightens-under-pressure") return "pressure-index-badge--tightens";
  if (label === "swallows-whistle-under-pressure") return "pressure-index-badge--swallows";
  return "pressure-index-badge--stable";
}

export function PressureIndexCard({
  pressureIndex,
  pressureTendencyLabel,
  baselineWhistleRate,
  pressureWhistleRate,
}: PressureIndexCardProps) {
  const displayLabel = pressureTendencyDisplayLabel(
    pressureTendencyLabel as PressureTendencyLabel,
  );

  return (
    <section
      className="pressure-index-card"
      aria-labelledby="ref-pressure-index-title"
    >
      <div className="pressure-index-head">
        <div>
          <p className="pressure-index-kicker">High-pressure whistle deviation</p>
          <h3 id="ref-pressure-index-title" className="pressure-index-title">
            Pressure Index
          </h3>
        </div>
        <span className={`pressure-index-badge ${badgeClass(pressureTendencyLabel)}`}>
          {displayLabel}
        </span>
      </div>

      <div className="pressure-index-track-wrap" aria-hidden>
        <div className="pressure-index-labels">
          <span>Swallows whistle</span>
          <span>Neutral (100)</span>
          <span>Tightens up</span>
        </div>
        <div className="pressure-index-track">
          <div className="pressure-index-neutral-zone" />
          <span
            className="pressure-index-thumb"
            style={{ left: gaugePosition(pressureIndex) }}
          />
        </div>
        {pressureIndex !== null ? (
          <p className="pressure-index-value tabular-nums text-right">
            Pressure Index: {pressureIndex.toFixed(0)}
          </p>
        ) : (
          <p className="pressure-index-value tabular-nums text-right">
            Pressure Index: withheld
          </p>
        )}
      </div>

      <div className="pressure-index-metrics">
        <div className="pressure-index-metric">
          <span className="pressure-index-metric-label">Baseline rate</span>
          <span className="pressure-index-metric-value tabular-nums">
            {baselineWhistleRate !== null ? `${baselineWhistleRate}/game` : "n/a"}
          </span>
        </div>
        <div className="pressure-index-metric">
          <span className="pressure-index-metric-label">Pressure rate</span>
          <span className="pressure-index-metric-value tabular-nums">
            {pressureWhistleRate !== null ? `${pressureWhistleRate}/game` : "n/a"}
          </span>
        </div>
      </div>

      <p className="pressure-index-footnote">
        Compares whistle frequency in playoff, national TV, and late close-game
        contexts against standard regular-season sample. 100 is neutral; above 100
        tightens, below 100 swallows the whistle.
      </p>
    </section>
  );
}

import {
  PRESSURE_GAUGE_LABELS,
  type PressureGaugeState,
} from "@/lib/analytics/leverage-sensitivity";
import "./scouting-report.css";

type PressureGaugeProps = {
  state: PressureGaugeState;
  leverageIndex: number | null;
  insight: string;
};

function gaugePosition(leverageIndex: number | null): string {
  if (leverageIndex === null) return "50%";
  const clamped = Math.max(-0.5, Math.min(0.5, leverageIndex));
  const pct = 50 + clamped * 80;
  return `${Math.max(8, Math.min(92, pct))}%`;
}

export function PressureGauge({ state, leverageIndex, insight }: PressureGaugeProps) {
  return (
    <section
      className="pressure-gauge-card"
      aria-labelledby="ref-pressure-gauge-title"
    >
      <div className="pressure-gauge-head">
        <div>
          <p className="pressure-gauge-kicker">Leverage sensitivity</p>
          <h3 id="ref-pressure-gauge-title" className="pressure-gauge-title">
            Pressure Gauge
          </h3>
        </div>
        <span className={`pressure-gauge-badge pressure-gauge-badge--${state}`}>
          {PRESSURE_GAUGE_LABELS[state]}
        </span>
      </div>

      <div className="pressure-gauge-track-wrap" aria-hidden>
        <div className="pressure-gauge-labels">
          <span>Swallows Whistle</span>
          <span>Neutral</span>
          <span>Tightens Up</span>
        </div>
        <div className="pressure-gauge-track">
          <div className="pressure-gauge-neutral-zone" />
          <span
            className="pressure-gauge-thumb"
            style={{ left: gaugePosition(leverageIndex) }}
          />
        </div>
        {leverageIndex !== null ? (
          <p className="pressure-gauge-index">
            Leverage Index: {leverageIndex > 0 ? "+" : ""}
            {(leverageIndex * 100).toFixed(0)}%
          </p>
        ) : null}
      </div>

      <p className="pressure-gauge-insight">{insight}</p>
    </section>
  );
}

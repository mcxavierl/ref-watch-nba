import { PRESSURE_GAUGE_LABELS } from "@/lib/analytics/leverage-sensitivity";
import type { ScoutingReport } from "@/lib/analytics/scouting-report-types";
import {
  consistencyIndexStateClass,
  consistencyStateClass,
  STATE_COLOR_CLASS,
} from "@/constants/colors";
import "./scouting-report.css";

type HandicappersInsightProps = {
  report: Pick<
    ScoutingReport,
    | "edgeNote"
    | "consistencyScore"
    | "consistencyIndex"
    | "consistencyClassificationDisplay"
    | "leverageSensitivityIndex"
    | "leverageProfile"
    | "leverageInsight"
    | "pressureGauge"
  >;
};

function volatilityLabel(report: HandicappersInsightProps["report"]): string {
  if (report.consistencyIndex !== null) {
    return report.consistencyClassificationDisplay;
  }
  if (report.consistencyScore <= 4) return "High volatility";
  if (report.consistencyScore >= 7) return "Low volatility";
  return "Moderate volatility";
}

function consistencyDisplay(report: HandicappersInsightProps["report"]): string {
  if (report.consistencyIndex !== null) {
    return `${volatilityLabel(report)} · Consistency ${report.consistencyIndex}/100`;
  }
  return `${volatilityLabel(report)} · Consistency ${report.consistencyScore}/10`;
}

function edgeSignal(report: HandicappersInsightProps["report"]): string {
  if (report.leverageProfile === "high-leverage-sensitivity") {
    return "Late-game Over lean when score stays within one possession.";
  }
  if (report.leverageProfile === "swallows-whistle") {
    return "Late-game Under lean when this ref works a tight finish.";
  }
  const volatile =
    report.consistencyIndex !== null
      ? report.consistencyIndex < 40
      : report.consistencyScore <= 4;
  if (volatile) {
    return "Totals market carries extra variance. Size down or wait for live numbers.";
  }
  return "No strong directional edge from leverage profile alone.";
}

function leverageStateClass(
  profile: HandicappersInsightProps["report"]["leverageProfile"],
): string {
  if (profile === "high-leverage-sensitivity") return STATE_COLOR_CLASS.caution;
  if (profile === "swallows-whistle") return STATE_COLOR_CLASS.stable;
  return STATE_COLOR_CLASS.neutral;
}

export function HandicappersInsight({ report }: HandicappersInsightProps) {
  const leverageLabel =
    report.leverageSensitivityIndex !== null
      ? `${report.leverageSensitivityIndex > 0 ? "+" : ""}${(report.leverageSensitivityIndex * 100).toFixed(0)}% (${PRESSURE_GAUGE_LABELS[report.pressureGauge]})`
      : "Insufficient close-game sample";

  return (
    <section
      className="handicappers-insight-card"
      aria-labelledby="handicappers-insight-title"
    >
      <p className="handicappers-insight-kicker">Handicapper&apos;s Insight</p>
      <h3 id="handicappers-insight-title" className="handicappers-insight-title">
        Betting edge summary
      </h3>
      <p className="handicappers-insight-lead">{report.edgeNote}</p>

      <dl className="handicappers-insight-grid">
        <div className="handicappers-insight-stat">
          <dt>Edge</dt>
          <dd className="tabular-nums text-right">{edgeSignal(report)}</dd>
        </div>
        <div className="handicappers-insight-stat">
          <dt>Volatility</dt>
          <dd
            className={`tabular-nums text-right ${
              report.consistencyIndex !== null
                ? consistencyIndexStateClass(report.consistencyIndex)
                : consistencyStateClass(report.consistencyScore)
            }`}
          >
            {consistencyDisplay(report)}
          </dd>
        </div>
        <div className="handicappers-insight-stat">
          <dt>Leverage Sensitivity</dt>
          <dd
            className={`tabular-nums text-right ${leverageStateClass(report.leverageProfile)}`}
          >
            {leverageLabel}
          </dd>
        </div>
      </dl>

      <p className="handicappers-insight-footnote">{report.leverageInsight}</p>
    </section>
  );
}

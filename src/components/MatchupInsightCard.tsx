import type { GameSlateMatchupInsight } from "@/lib/game-slate-matchup-insights";
import { inferSignificantKpiTone } from "@/lib/metric-significance";
import { SEMANTIC_IMPACT_TEXT_CLASS } from "@/lib/semantic-impact";
import "@/components/matchup-insight-card.css";

type MatchupInsightCardProps = {
  insight: GameSlateMatchupInsight;
  className?: string;
};

export function MatchupInsightCard({ insight, className = "" }: MatchupInsightCardProps) {
  const metricTone = inferSignificantKpiTone(insight.metric);
  const metricClass = SEMANTIC_IMPACT_TEXT_CLASS[metricTone];

  return (
    <article
      className={`matchup-insight-card border border-slate-800 bg-slate-900/40${className ? ` ${className}` : ""}`}
      aria-label={`${insight.contextPill}: ${insight.title}`}
    >
      <span className="matchup-insight-card__pill">{insight.contextPill}</span>
      <h4 className="matchup-insight-card__title">{insight.title}</h4>
      <p className={`matchup-insight-card__metric font-tabular tabular-nums ${metricClass}`}>
        {insight.metric}
      </p>
      <p className="matchup-insight-card__summary">{insight.summary}</p>
    </article>
  );
}

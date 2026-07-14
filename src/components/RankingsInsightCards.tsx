import Link from "next/link";
import { HeroHighlightsHeader } from "@/components/dashboard/HeroHighlightsHeader";
import type { LeagueId } from "@/lib/leagues";
import type { RankingsSynthesis } from "@/lib/rankings-synthesis";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import { statValueDelightTone } from "@/lib/metric-delight";

function insightCardTone(
  statValue: string | undefined,
): "positive" | "negative" | "neutral" {
  if (!statValue) return "neutral";
  const delight = statValueDelightTone(statValue);
  if (delight === "positive" || delight === "standout-high") return "positive";
  if (delight === "negative" || delight === "standout-low") return "negative";
  return "neutral";
}

export function RankingsInsightCards({
  synthesis,
  basePath = "",
  leagueId,
  variant = "section",
}: {
  synthesis: RankingsSynthesis;
  basePath?: string;
  leagueId: LeagueId;
  variant?: "section" | "hero";
}) {
  if (synthesis.insights.length === 0) return null;

  const cards = (
    <ul
      className={
        variant === "hero"
          ? "rankings-insight-grid rankings-insight-grid--hero"
          : "rankings-insight-grid"
      }
    >
      {synthesis.insights.map((insight) => {
        const tone = insight.statValue
          ? statValueDelightTone(insight.statValue)
          : "neutral";
        const cardTone = insightCardTone(insight.statValue);

        return (
          <li
            key={insight.id}
            className="rankings-insight-card"
            data-league={leagueId}
            data-tone={cardTone}
          >
            <div className="rankings-insight-card-head">
              <p className="rankings-insight-kicker">{insight.title}</p>
            </div>
            {insight.refSlug && insight.refName ? (
              <Link
                href={`${basePath}/refs/${insight.refSlug}`}
                className="rankings-insight-name"
              >
                {insight.refName}
              </Link>
            ) : insight.refName ? (
              <p className="rankings-insight-name">{insight.refName}</p>
            ) : null}
            {insight.statValue && (
              <div className="rankings-insight-metric" aria-label={insight.statLabel}>
                <StandoutMetricValue tone={tone} size="lg">
                  {insight.statValue}
                </StandoutMetricValue>
              </div>
            )}
            <p className="rankings-insight-body">{insight.body}</p>
          </li>
        );
      })}
    </ul>
  );

  if (variant === "hero") {
    return (
      <div className="hero-highlights-block hero-highlights-block--league">
        <HeroHighlightsHeader
          title="Top highlights"
          lead="Recent high-confidence patterns"
        />
        {cards}
      </div>
    );
  }

  return (
    <section className="section-block">
      <h2 className="section-title">{synthesis.headline}</h2>
      <p className="section-lead">{synthesis.subhead}</p>
      {cards}
      <p className="rankings-insight-summary">{synthesis.leagueSummary}</p>
    </section>
  );
}

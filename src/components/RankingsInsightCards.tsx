import Link from "next/link";
import type { LeagueId } from "@/lib/leagues";
import type { RankingsSynthesis } from "@/lib/rankings-synthesis";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import { statValueDelightTone } from "@/lib/metric-delight";

export function RankingsInsightCards({
  synthesis,
  basePath = "",
  leagueId,
  leagueShortLabel,
}: {
  synthesis: RankingsSynthesis;
  basePath?: string;
  leagueId: LeagueId;
  leagueShortLabel: string;
}) {
  if (synthesis.insights.length === 0) return null;

  return (
    <section className="section-block">
      <h2 className="section-title">{synthesis.headline}</h2>
      <p className="section-lead">{synthesis.subhead}</p>
      <ul className="rankings-insight-grid">
        {synthesis.insights.map((insight) => {
          const tone = insight.statValue
            ? statValueDelightTone(insight.statValue)
            : "neutral";

          return (
            <li key={insight.id} className="rankings-insight-card" data-league={leagueId}>
              <div className="rankings-insight-card-head">
                <span className="rankings-insight-league">{leagueShortLabel}</span>
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
      <p className="rankings-insight-summary">{synthesis.leagueSummary}</p>
    </section>
  );
}

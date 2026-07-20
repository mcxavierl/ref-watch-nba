import { HighlightStatCard } from "@/components/HighlightStatCard";
import {
  highlightCardAccentForInsight,
  highlightCardIconForInsight,
} from "@/lib/highlight-card-visuals";
import type { LeagueId } from "@/lib/leagues";
import type { RankingsInsight } from "@/lib/rankings-synthesis";

function LeagueHomeInsightGrid({
  insights,
  leagueId,
  basePath,
  gridClassName,
  notable = false,
  avatarSport,
}: {
  insights: RankingsInsight[];
  leagueId: LeagueId;
  basePath: string;
  gridClassName: string;
  notable?: boolean;
  avatarSport?: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba";
}) {
  if (insights.length === 0) return null;

  return (
    <ul className={gridClassName}>
      {insights.map((insight) => (
        <HighlightStatCard
          key={insight.id}
          leagueId={leagueId}
          insightKind={insight.id}
          accent={highlightCardAccentForInsight(insight.id)}
          tone="neutral"
          icon={highlightCardIconForInsight(insight.id)}
          kicker={insight.title}
          refName={insight.refName}
          refSlug={insight.refSlug}
          basePath={basePath}
          statValue={insight.statValue}
          statLabel={insight.statLabel}
          categoryHref={insight.categoryHref}
          body={insight.body}
          heroPills
          notable={notable}
          avatarSport={avatarSport}
        />
      ))}
    </ul>
  );
}

export function LeagueHomeInsightSections({
  pulse,
  matchups,
  spotlights,
  leagueId,
  basePath,
  sport,
}: {
  pulse: RankingsInsight[];
  matchups: RankingsInsight[];
  spotlights: RankingsInsight[];
  leagueId: LeagueId;
  basePath: string;
  sport: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb" | "wnba";
}) {
  const hasContent =
    pulse.length > 0 || matchups.length > 0 || spotlights.length > 0;
  if (!hasContent) return null;

  return (
    <div className="league-home-insights">
      {pulse.length > 0 ? (
        <section className="section-block league-home-insights-section">
          <div className="overview-section-header overview-section-header--primary">
            <h2 className="overview-section-title">League pulse</h2>
            <p className="overview-section-lead">
              Highest-confidence anomalies in the current sample.
            </p>
          </div>
          <LeagueHomeInsightGrid
            insights={pulse}
            leagueId={leagueId}
            basePath={basePath}
            gridClassName="league-pulse-grid rankings-insight-grid rankings-insight-grid--hero"
            notable
            avatarSport={sport}
          />
        </section>
      ) : null}

      {matchups.length > 0 ? (
        <section className="section-block league-home-insights-section">
          <div className="overview-section-header">
            <h2 className="section-title">Key matchup targets</h2>
            <p className="section-lead">
              Marquee slate games with the strongest betting split and leverage signals.
            </p>
          </div>
          <LeagueHomeInsightGrid
            insights={matchups}
            leagueId={leagueId}
            basePath={basePath}
            gridClassName="league-matchup-grid rankings-insight-grid"
          />
        </section>
      ) : null}

      {spotlights.length > 0 ? (
        <section className="section-block league-home-insights-section">
          <div className="overview-section-header">
            <h2 className="section-title">Official spotlights</h2>
            <p className="section-lead">
              Referees trending on high-variance whistle, scoring, and split data.
            </p>
          </div>
          <LeagueHomeInsightGrid
            insights={spotlights}
            leagueId={leagueId}
            basePath={basePath}
            gridClassName="league-spotlight-grid rankings-insight-grid"
            notable
            avatarSport={sport}
          />
        </section>
      ) : null}
    </div>
  );
}

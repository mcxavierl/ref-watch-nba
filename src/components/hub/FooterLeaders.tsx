import { HighlightStatCard } from "@/components/HighlightStatCard";
import type { AnalyticsLeaderItem } from "@/components/AnalyticsLeadersSection";
import type { LeagueId } from "@/lib/leagues";
import { leagueGamesUnit } from "@/lib/leagues";
import {
  highlightCardAccentForLeaderCategory,
  highlightCardIconForLeaderCategory,
} from "@/lib/highlight-card-visuals";
import { formatRefGamesMeta } from "@/lib/ref-number";

/**
 * Footer analytics leaders: league hub cards with neutral baseline comparisons.
 * Semantic color is not applied to whistle/scoring deltas vs league average.
 */
export function FooterLeaders({
  leaders,
  leagueId,
  hrefPrefix,
  sport,
  title,
  lead,
}: {
  leaders: AnalyticsLeaderItem[];
  leagueId: LeagueId;
  hrefPrefix: string;
  sport: "nfl" | "epl" | "laliga" | "cfb";
  title: string;
  lead: string;
}) {
  if (leaders.length === 0) return null;

  return (
    <section className="section-block footer-leaders">
      <div className="section-block-header">
        <h2 className="section-title">{title}</h2>
        <p className="section-lead">{lead}</p>
      </div>
      <ul className="rankings-insight-grid">
        {leaders.map((item) => (
          <HighlightStatCard
            key={item.category}
            leagueId={leagueId}
            insightKind={item.category}
            accent={highlightCardAccentForLeaderCategory(item.category)}
            tone="neutral"
            icon={highlightCardIconForLeaderCategory(item.category)}
            kicker={item.title}
            refName={item.ref.name}
            refSlug={item.ref.slug}
            basePath={hrefPrefix}
            statValue={item.value}
            statLabel={item.title}
            body={item.detail}
            avatarSport={sport}
            refMeta={formatRefGamesMeta(item.ref.number, item.ref.games, leagueGamesUnit(leagueId))}
          />
        ))}
      </ul>
    </section>
  );
}

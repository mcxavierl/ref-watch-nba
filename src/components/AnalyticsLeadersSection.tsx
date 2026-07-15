import { HighlightStatCard } from "@/components/HighlightStatCard";
import type { LeagueId } from "@/lib/leagues";
import {
  highlightCardAccentForLeaderCategory,
  highlightCardIconForLeaderCategory,
  leaderHighlightTone,
} from "@/lib/highlight-card-visuals";
import { formatRefGamesMeta } from "@/lib/ref-number";
import type { RefProfile } from "@/lib/types";

export type AnalyticsLeaderItem = {
  category: string;
  title: string;
  detail: string;
  ref: RefProfile;
  value: string;
  delta?: number;
};

export function AnalyticsLeadersSection({
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
    <section className="section-block">
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
            tone={leaderHighlightTone(item.category, item.value, item.delta)}
            icon={highlightCardIconForLeaderCategory(item.category)}
            kicker={item.title}
            refName={item.ref.name}
            refSlug={item.ref.slug}
            basePath={hrefPrefix}
            statValue={item.value}
            statLabel={item.title}
            body={item.detail}
            avatarSport={sport}
            refMeta={formatRefGamesMeta(item.ref.number, item.ref.games, "matches")}
          />
        ))}
      </ul>
    </section>
  );
}

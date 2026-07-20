import { HeroHighlightsHeader } from "@/components/dashboard/HeroHighlightsHeader";
import { HighlightStatCard } from "@/components/HighlightStatCard";
import type { LeagueId } from "@/lib/leagues";
import {
  highlightCardAccentForInsight,
  highlightCardIconForInsight,
  rankingsInsightCardTone,
} from "@/lib/highlight-card-visuals";
import type { RankingsSynthesis } from "@/lib/rankings-synthesis";

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
          ? "rankings-insight-grid rankings-insight-grid--hero rankings-insight-grid--hero-focus"
          : "rankings-insight-grid"
      }
    >
      {synthesis.insights.map((insight) => (
        <HighlightStatCard
          key={insight.refSlug ?? insight.id}
          leagueId={leagueId}
          insightKind={insight.id.startsWith("gsni-highlight") ? "gsni-highlight" : insight.id}
          accent={highlightCardAccentForInsight(
            insight.id.startsWith("gsni-highlight") ? "gsni-highlight" : insight.id,
          )}
          tone={rankingsInsightCardTone(insight)}
          icon={highlightCardIconForInsight(
            insight.id.startsWith("gsni-highlight") ? "gsni-highlight" : insight.id,
          )}
          kicker={insight.title}
          refName={insight.refName}
          refSlug={insight.refSlug}
          basePath={basePath}
          statValue={insight.statValue}
          statLabel={insight.statLabel}
          categoryHref={insight.categoryHref}
          body={insight.body}
          heroPills={variant === "hero"}
        />
      ))}
    </ul>
  );

  if (variant === "hero") {
    return (
      <div className="hero-highlights-block hero-highlights-block--league hero-highlights-block--insights-hub">
        <HeroHighlightsHeader title="Top highlights" />
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

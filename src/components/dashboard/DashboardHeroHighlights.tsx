import { HeroHighlightsHeader } from "@/components/dashboard/HeroHighlightsHeader";
import {
  DASHBOARD_HERO_HIGHLIGHTS,
  type DashboardHeroHighlight,
} from "@/lib/dashboard-hero-highlights";

function DashboardHeroHighlightCard({ highlight }: { highlight: DashboardHeroHighlight }) {
  let metricIndex = 0;

  return (
    <article
      className="dashboard-hero-highlight-card"
      data-league={highlight.leagueId}
      data-tone={highlight.tone}
    >
      <header className="dashboard-hero-highlight-head">
        <span className="dashboard-hero-highlight-mark" aria-hidden />
        <span className="dashboard-hero-highlight-league">{highlight.leagueLabel}</span>
      </header>
      <p className="dashboard-hero-highlight-body">
        <span className="dashboard-hero-highlight-official">{highlight.official}:</span>{" "}
        {highlight.parts.map((part, index) =>
          part.type === "metric" ? (
            <span
              key={`${highlight.leagueId}-metric-${index}`}
              className="dashboard-hero-highlight-metric"
              data-tone={highlight.tone}
              data-metric={metricIndex++ === 0 ? "primary" : "secondary"}
            >
              {part.value}
            </span>
          ) : (
            <span key={`${highlight.leagueId}-text-${index}`}>{part.value}</span>
          ),
        )}
      </p>
    </article>
  );
}

export function DashboardHeroHighlights() {
  return (
    <div className="hero-highlights-block">
      <HeroHighlightsHeader />
      <div
        className="dashboard-hero-highlights"
        role="list"
        aria-label="High-confidence outlier patterns across live leagues"
      >
        {DASHBOARD_HERO_HIGHLIGHTS.map((highlight) => (
          <div key={highlight.leagueId} role="listitem">
            <DashboardHeroHighlightCard highlight={highlight} />
          </div>
        ))}
      </div>
    </div>
  );
}

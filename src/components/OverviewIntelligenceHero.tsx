import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import { buildDailyIntelligenceBriefing } from "@/lib/homepage-intelligence";

type OverviewIntelligenceHeroProps = {
  data: CrossLeagueOverview;
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function OverviewIntelligenceHero({ data }: OverviewIntelligenceHeroProps) {
  const briefing = buildDailyIntelligenceBriefing(data);

  return (
    <section
      className="overview-intelligence-hero section-block"
      aria-labelledby="overview-intelligence-heading"
    >
      <div className="overview-intelligence-hero-copy">
        <p className="overview-intelligence-eyebrow">Today&apos;s Officiating Intelligence</p>
        <h1 className="overview-title" id="overview-intelligence-heading">
          Officiating Intelligence
        </h1>
        <p className="overview-intelligence-subtitle">
          Real-time behavioral modeling, crew friction analytics, and anomaly detection.
        </p>
      </div>

      <div
        className="overview-intelligence-briefing"
        role="status"
        aria-label="Today's intelligence summary"
      >
        <p className="overview-intelligence-briefing-label">Today&apos;s Intelligence</p>
        <p className="overview-intelligence-briefing-copy">
          <span className="overview-intelligence-briefing-stat">
            <strong>{formatCount(briefing.gamesAnalyzed)}</strong> Games Analyzed
          </span>
          <span className="overview-intelligence-briefing-sep" aria-hidden>
            |
          </span>
          <span className="overview-intelligence-briefing-stat overview-intelligence-briefing-stat--confidence">
            <strong>{formatCount(briefing.significantCrewEffects)}</strong> Statistically
            Significant Crew Effects
          </span>
          <span className="overview-intelligence-briefing-sep" aria-hidden>
            |
          </span>
          <span className="overview-intelligence-briefing-stat overview-intelligence-briefing-stat--anomaly">
            <strong>{formatCount(briefing.anomalyAlerts)}</strong> Anomaly Alerts
          </span>
          <span className="overview-intelligence-briefing-sep" aria-hidden>
            |
          </span>
          <span className="overview-intelligence-briefing-stat overview-intelligence-briefing-stat--signal">
            Top Signal: <strong>{briefing.topSignalMatchup}</strong>
          </span>
        </p>
      </div>
    </section>
  );
}

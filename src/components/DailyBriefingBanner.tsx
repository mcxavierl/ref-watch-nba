type DailyBriefingBannerProps = {
  matchupCount: number;
  liveLeagueCount: number;
  anomalyCount: number;
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function DailyBriefingBanner({
  matchupCount,
  liveLeagueCount,
  anomalyCount,
}: DailyBriefingBannerProps) {
  return (
    <aside className="overview-intelligence-briefing" aria-label="Daily intelligence briefing">
      <p className="overview-intelligence-briefing-label">Today&apos;s briefing</p>
      <p className="overview-intelligence-briefing-copy">
        <span className="overview-intelligence-briefing-stat overview-intelligence-briefing-stat--signal">
          <strong>{formatCount(matchupCount)}</strong> matchups on slate
        </span>
        <span className="overview-intelligence-briefing-sep" aria-hidden>
          ·
        </span>
        <span className="overview-intelligence-briefing-stat">
          <strong>{formatCount(liveLeagueCount)}</strong> live leagues tracked
        </span>
        <span className="overview-intelligence-briefing-sep" aria-hidden>
          ·
        </span>
        <span className="overview-intelligence-briefing-stat overview-intelligence-briefing-stat--anomaly">
          <strong>{formatCount(anomalyCount)}</strong> anomaly alerts gated
        </span>
      </p>
    </aside>
  );
}

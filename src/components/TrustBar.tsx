import {
  buildTrustBarStats,
  formatTrustBarSegment,
} from "@/lib/trust-bar-stats";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";

type TrustBarProps = {
  data: CrossLeagueOverview;
};

export function TrustBar({ data }: TrustBarProps) {
  const stats = buildTrustBarStats(data);
  const segments = formatTrustBarSegment(stats);

  if (stats.gamesAnalyzed <= 0 && stats.officials <= 0) {
    return null;
  }

  return (
    <div className="overview-trust-bar" aria-label="Dataset coverage summary">
      <p className="overview-trust-bar-copy">
        {segments.map((segment, index) => (
          <span key={segment} className="overview-trust-bar-segment">
            {index > 0 ? (
              <span className="overview-trust-bar-divider" aria-hidden>
                |
              </span>
            ) : null}
            {segment}
          </span>
        ))}
      </p>
    </div>
  );
}

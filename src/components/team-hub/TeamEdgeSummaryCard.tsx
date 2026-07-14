import Link from "next/link";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type { TeamEdgeSummary } from "@/lib/team-insight-hub";

export function TeamEdgeSummaryCard({
  summary,
  teamLabel,
  basePath = "",
}: {
  summary: TeamEdgeSummary;
  teamLabel: string;
  basePath?: string;
}) {
  const { topFinding, reliabilityScore, reliabilityLabel, bestRef, worstRef } =
    summary;

  return (
    <section className="team-hub-edge-card" aria-label="Team edge summary">
      <div className="team-hub-edge-card-grid">
        <div className="team-hub-edge-primary">
          <p className="team-hub-eyebrow">Top finding</p>
          {topFinding ? (
            <>
              <h2 className="team-hub-edge-headline">{topFinding.headline}</h2>
              <p className="team-hub-edge-body">{topFinding.body}</p>
              {topFinding.refSlug && topFinding.refName && (
                <Link
                  href={`${basePath}/refs/${topFinding.refSlug}`}
                  className="team-hub-edge-link"
                >
                  {topFinding.refName} profile →
                </Link>
              )}
            </>
          ) : (
            <p className="team-hub-edge-body">
              No statistically significant ref patterns for {teamLabel} in the
              current sample.
            </p>
          )}
        </div>

        <div className="team-hub-edge-metrics">
          <div className="team-hub-metric">
            <p className="team-hub-metric-label">Referee reliability</p>
            <p className="team-hub-metric-value">{reliabilityScore}%</p>
            <p className="team-hub-metric-detail">{reliabilityLabel}</p>
          </div>

          {bestRef && (
            <div className="team-hub-badge team-hub-badge--positive">
              <p className="team-hub-badge-label">Best ref</p>
              <p className="team-hub-badge-name">{bestRef.name}</p>
              <p className="team-hub-badge-stat">
                {formatPct(bestRef.winRate)} · {formatSigned(bestRef.deltaPts)}{" "}
                pts
              </p>
            </div>
          )}

          {worstRef && (
            <div className="team-hub-badge team-hub-badge--negative">
              <p className="team-hub-badge-label">Worst ref</p>
              <p className="team-hub-badge-name">{worstRef.name}</p>
              <p className="team-hub-badge-stat">
                {formatPct(worstRef.winRate)} · {formatSigned(worstRef.deltaPts)}{" "}
                pts
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

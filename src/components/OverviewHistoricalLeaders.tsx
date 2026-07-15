import Link from "next/link";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";

type OverviewHistoricalLeadersProps = {
  refs: CrossLeagueOverview["allRefs"];
  limit?: number;
};

function formatGames(n: number): string {
  return n.toLocaleString("en-US");
}

export function OverviewHistoricalLeaders({
  refs,
  limit = 6,
}: OverviewHistoricalLeadersProps) {
  const leaders = refs.slice(0, limit);
  if (leaders.length === 0) return null;

  return (
    <section
      className="overview-editorial-section overview-editorial-section--leaders section-block overview-section--secondary"
      aria-labelledby="overview-historical-leaders-heading"
    >
      <div className="overview-section-header overview-section-header--compact">
        <h2 className="overview-section-title" id="overview-historical-leaders-heading">
          Historical leaders
        </h2>
        <p className="overview-section-lead">
          Deepest verified samples across live leagues - useful when you need historical context.
        </p>
      </div>

      <ol className="overview-historical-leaders-list">
        {leaders.map((ref, index) => (
          <li key={`${ref.leagueId}-${ref.slug}`} className="overview-historical-leader">
            <span className="overview-historical-leader-rank" aria-hidden>
              {index + 1}
            </span>
            <div className="overview-historical-leader-copy">
              <Link href={ref.href} className="overview-historical-leader-name rw-focus-ring">
                {ref.name}
              </Link>
              <p className="overview-historical-leader-meta">
                {ref.leagueLabel} · {formatGames(ref.games)} games logged
              </p>
            </div>
            <Link href={ref.href} className="overview-historical-leader-cta rw-focus-ring">
              Profile
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

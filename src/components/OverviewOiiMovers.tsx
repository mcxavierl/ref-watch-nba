import Link from "next/link";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import { oiiMethodologyTooltip } from "@/lib/officiating-intelligence-index";
import type { OiiMoversSnapshot } from "@/lib/oii-movers";

type OverviewOiiMoversProps = {
  snapshot: OiiMoversSnapshot;
};

export function OverviewOiiMovers({ snapshot }: OverviewOiiMoversProps) {
  if (snapshot.movers.length === 0) return null;

  const methodology = oiiMethodologyTooltip();

  return (
    <section
      className="overview-editorial-section overview-editorial-section--oii-movers section-block overview-section--secondary"
      aria-labelledby="overview-oii-movers-heading"
    >
      <div className="overview-section-header overview-section-header--compact">
        <MetricInfoHint hint={methodology} className="overview-oii-movers-heading-wrap">
          <h2 className="overview-section-title" id="overview-oii-movers-heading">
            Referee OII movers
          </h2>
        </MetricInfoHint>
        <p className="overview-section-lead">
          Officials with the largest OII rise over the last {snapshot.windowDays} days of logged
          games (through {formatAsOfDate(snapshot.asOfDate)}).
        </p>
      </div>

      <ol className="overview-oii-movers-list">
        {snapshot.movers.map((mover, index) => (
          <li
            key={`${mover.leagueId}-${mover.slug}`}
            className="overview-oii-mover-card"
            data-league={mover.leagueId}
          >
            <span className="overview-oii-mover-rank" aria-hidden>
              {index + 1}
            </span>

            <div className="overview-oii-mover-main">
              <div className="overview-oii-mover-head">
                <span className="overview-oii-mover-league-mark" aria-hidden>
                  <LeagueNavMark league={mover.leagueId} active={false} />
                </span>
                <Link href={mover.href} className="overview-oii-mover-name rw-focus-ring">
                  {mover.name}
                </Link>
                <span className="overview-oii-mover-league">{mover.leagueLabel}</span>
              </div>
              <p className="overview-oii-mover-meta">
                {mover.recentGamesInWindow} game{mover.recentGamesInWindow === 1 ? "" : "s"} in
                window · prior {mover.priorScore}
              </p>
            </div>

            <div className="overview-oii-mover-score-block">
              <span className="overview-oii-mover-delta">+{mover.delta}</span>
              <span className="overview-oii-mover-current">{mover.currentScore}</span>
              <span className="overview-oii-mover-score-label">OII</span>
            </div>

            <Link href={mover.href} className="overview-oii-mover-cta rw-focus-ring">
              Profile
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function formatAsOfDate(isoDate: string): string {
  if (!isoDate) return "latest logs";
  const parsed = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

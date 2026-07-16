import type { NcaaRouteLeague } from "@/lib/ncaa-conference-gate";
import { getConferenceCoverageRows } from "@/lib/ncaa-conference-coverage";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { LEAGUES } from "@/lib/leagues";

type ConferenceCoverageProps = {
  leagueId: NcaaRouteLeague;
};

export function ConferenceCoverage({ leagueId }: ConferenceCoverageProps) {
  const league = LEAGUES[leagueId];
  const coverageRows = getConferenceCoverageRows(leagueId);
  const headingId = "ncaa-live-coverage-heading";

  return (
    <div className="ncaa-coverage-wrap">
      <section
        className="ncaa-coverage-status"
        aria-labelledby={headingId}
      >
        <header className="ncaa-coverage-status-head">
          <span className="ncaa-coverage-live-indicator" aria-hidden>
            <span className="ncaa-coverage-live-dot" />
          </span>
          <div className="ncaa-coverage-status-copy">
            <p className="ncaa-coverage-eyebrow">Conference coverage</p>
            <h2 className="ncaa-coverage-title" id={headingId}>
              {league.label}: key conferences
            </h2>
            <p className="ncaa-coverage-lead">
              Referee analytics below reflect verified game and crew data for the conferences
              listed here. Status reflects distinct games with crew coverage in each conference.
              Other leagues and programs are not included in current totals.
            </p>
          </div>
        </header>

      <ul className="ncaa-coverage-live-grid" role="list">
        {coverageRows.map((row) => (
          <li key={row.conferenceId} className="ncaa-coverage-live-item">
            <span className="ncaa-coverage-live-item-dot" aria-hidden />
            <span className="ncaa-coverage-live-item-label">{row.name}</span>
            <StatusBadge verdict={row.verdict} label={row.maturity} compact />
          </li>
        ))}
      </ul>

      <p className="ncaa-coverage-upcoming">
        Additional conferences are planned for future coverage expansions.
      </p>
      </section>
    </div>
  );
}

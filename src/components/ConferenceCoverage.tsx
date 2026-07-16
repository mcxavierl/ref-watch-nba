import type { NcaaRouteLeague } from "@/lib/ncaa-conference-gate";
import { getConferenceCoverageRows } from "@/lib/ncaa-conference-coverage";
import { NcaaConferenceLogo } from "@/components/NcaaConferenceLogo";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { LEAGUES } from "@/lib/leagues";
import "@/components/conference-coverage.css";

type ConferenceCoverageProps = {
  leagueId: NcaaRouteLeague;
  variant?: "default" | "clinical";
};

export function ConferenceCoverage({
  leagueId,
  variant = "default",
}: ConferenceCoverageProps) {
  const league = LEAGUES[leagueId];
  const coverageRows = getConferenceCoverageRows(leagueId);
  const headingId = "ncaa-live-coverage-heading";
  const isClinical = variant === "clinical" || leagueId === "cbb";

  if (isClinical) {
    return (
      <div className="ncaa-coverage-wrap ncaa-coverage-wrap--clinical">
        <section
          className="ncaa-coverage-status ncaa-coverage-status--clinical"
          aria-labelledby={headingId}
        >
          <header className="ncaa-coverage-status-head ncaa-coverage-status-head--clinical">
            <div className="ncaa-coverage-status-copy">
              <h2 className="ncaa-coverage-title ncaa-coverage-title--clinical" id={headingId}>
                Conference Hubs: Pre-Season Status
              </h2>
              <p className="ncaa-coverage-lead ncaa-coverage-lead--clinical">
                Referee analytics below reflect verified game data for the conferences listed
                here. Additional leagues and programs are not included in current totals.
              </p>
            </div>
          </header>

          <ul className="ncaa-coverage-clinical-grid" role="list">
            {coverageRows.map((row) => (
              <li key={row.conferenceId} className="ncaa-coverage-clinical-item">
                <NcaaConferenceLogo conferenceId={row.conferenceId} size={32} />
                <span className="ncaa-coverage-clinical-name">{row.conferenceId}</span>
                <span className="ncaa-coverage-clinical-tag tabular-nums">
                  {row.distinctGames > 0
                    ? `${row.distinctGames.toLocaleString("en-US")} games`
                    : "Pre-season"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div className="ncaa-coverage-wrap">
      <section className="ncaa-coverage-status" aria-labelledby={headingId}>
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
              Referee analytics below reflect verified game data for the conferences listed
              here. Status reflects distinct games with referee coverage in each conference.
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

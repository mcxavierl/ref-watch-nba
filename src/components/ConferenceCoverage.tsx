import type { NcaaRouteLeague } from "@/lib/ncaa-conference-gate";
import { LIVE_NCAA_CONFERENCES, type LiveNcaaConferenceId } from "@/lib/ncaa-conference-gate";
import { LEAGUES } from "@/lib/leagues";

/** Internal allowlist IDs → user-facing conference names (never rendered in the DOM). */
const CONFERENCE_DISPLAY_RECORD: Record<LiveNcaaConferenceId, string> = {
  ACC: "Atlantic Coast Conference",
  SEC: "Southeastern Conference",
  "Big Ten": "Big Ten Conference",
};

type LiveConferenceRow = {
  readonly name: string;
};

function liveConferenceRows(): readonly LiveConferenceRow[] {
  return LIVE_NCAA_CONFERENCES.map((id) => ({
    name: CONFERENCE_DISPLAY_RECORD[id],
  }));
}

type ConferenceCoverageProps = {
  leagueId: NcaaRouteLeague;
};

export function ConferenceCoverage({ leagueId }: ConferenceCoverageProps) {
  const league = LEAGUES[leagueId];
  const liveRows = liveConferenceRows();
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
            <p className="ncaa-coverage-eyebrow">Live coverage</p>
            <h2 className="ncaa-coverage-title" id={headingId}>
              {league.label} — key conferences
            </h2>
            <p className="ncaa-coverage-lead">
              Referee analytics below reflect verified game and crew data for the conferences
              listed here. Other leagues and programs are not included in current totals.
            </p>
          </div>
        </header>

      <ul className="ncaa-coverage-live-grid" role="list">
        {liveRows.map((row) => (
          <li key={row.name} className="ncaa-coverage-live-item">
            <span className="ncaa-coverage-live-item-dot" aria-hidden />
            <span className="ncaa-coverage-live-item-label">{row.name}</span>
            <span className="ncaa-coverage-live-item-badge">Live</span>
          </li>
        ))}
      </ul>

      <p className="ncaa-coverage-upcoming">
        Additional conferences coming in future integrity audit cycles.
      </p>
      </section>
    </div>
  );
}

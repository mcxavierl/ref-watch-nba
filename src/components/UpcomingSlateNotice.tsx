export function UpcomingSlateNotice({
  league,
  note,
  matchups,
  slateDate,
}: {
  league: string;
  note?: string;
  matchups: string[];
  slateDate?: string;
}) {
  const dateLabel = slateDate
    ? new Date(`${slateDate}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className="offseason-status-strip upcoming-slate-notice"
      role="status"
      aria-label={`${league} upcoming slate, crews pending`}
    >
      <div className="offseason-status-copy-block">
        <p className="offseason-status-copy">
          {note ??
            `Upcoming ${league} matchups${dateLabel ? ` on ${dateLabel}` : ""}. Crew assignments not published yet.`}
        </p>
        {matchups.length > 0 ? (
          <ul className="upcoming-slate-matchups">
            {matchups.map((matchup) => (
              <li key={matchup}>{matchup}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

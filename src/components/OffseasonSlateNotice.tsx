import { SeasonNotifyCta } from "@/components/SeasonNotifyCta";

export function OffseasonSlateNotice({ league }: { league: "NBA" | "NHL" }) {
  return (
    <div
      className="offseason-status-strip"
      role="status"
      aria-label={`${league} offseason, no live slate`}
    >
      <div className="offseason-status-strip-main">
        <span className="offseason-status-pill">No live slate · offseason</span>
        <p className="offseason-status-copy">
          Historical data only. Live crew assignments return when the {league}{" "}
          schedule resumes.
        </p>
      </div>
      <div className="offseason-status-strip-cta">
        <SeasonNotifyCta league={league} />
      </div>
    </div>
  );
}

import { SeasonNotifyCta } from "@/components/SeasonNotifyCta";

type OffseasonLeague = "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB";

const COLLEGE_LEAGUES = new Set<OffseasonLeague>(["CBB", "CFB"]);

const OFFSEASON_COPY: Record<OffseasonLeague, { status: string; detail?: string }> = {
  NBA: {
    status: "Live crew assignments return when the NBA schedule resumes.",
  },
  NHL: {
    status: "Live crew assignments return when the NHL schedule resumes.",
  },
  NFL: {
    status: "Live crew assignments return when the NFL week publishes.",
  },
  EPL: {
    status: "Matchday assignments return when the Premier League schedule resumes.",
    detail:
      "Team pages cover all 20 PL clubs for 2025-26. Ref profiles and card/foul tendencies populate as matches log.",
  },
  CBB: {
    status: "Season opens soon. Crews and tendencies load from game data.",
    detail:
      "Team directory covers ACC, Big Ten, SEC, Big 12, and Big East. Ref profiles populate as games log.",
  },
  CFB: {
    status: "Kickoff pending. Crews and penalty tendencies load from game data.",
    detail:
      "Team pages track Power Four and Group of Five programs. Official profiles fill in as Saturdays log.",
  },
};

export function OffseasonSlateNotice({ league }: { league: OffseasonLeague }) {
  const copy = OFFSEASON_COPY[league];
  const isCollege = COLLEGE_LEAGUES.has(league);

  return (
    <div
      className={`offseason-status-strip${isCollege ? " offseason-status-strip--college" : ""}`}
      role="status"
      aria-label={`${league} offseason, no live slate tonight`}
    >
      <div className="offseason-status-copy-block">
        <p className="offseason-status-copy">{copy.status}</p>
        {copy.detail ? (
          <p className="offseason-status-detail">{copy.detail}</p>
        ) : null}
      </div>
      <div className="offseason-status-strip-cta">
        <SeasonNotifyCta league={league} />
      </div>
    </div>
  );
}

const SCOREBOARD_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function yyyymmdd(isoDate: string): string {
  return isoDate.slice(0, 10).replace(/-/g, "");
}

export interface WnbaScoreboardEvent {
  id: string;
  date: string;
  status: string;
  awayAbbr: string;
  homeAbbr: string;
}

export async function fetchWnbaScoreboard(
  yyyymmddDate: string,
): Promise<WnbaScoreboardEvent[]> {
  const res = await fetch(`${SCOREBOARD_BASE}/scoreboard?dates=${yyyymmddDate}`);
  if (!res.ok) {
    throw new Error(`ESPN WNBA scoreboard ${yyyymmddDate}: ${res.status}`);
  }
  const body = (await res.json()) as {
    events?: {
      id: string;
      date: string;
      status?: { type?: { name?: string } };
      competitions?: {
        competitors?: {
          homeAway: string;
          team?: { abbreviation?: string };
        }[];
      }[];
    }[];
  };

  const events: WnbaScoreboardEvent[] = [];
  for (const event of body.events ?? []) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    let awayAbbr = "";
    let homeAbbr = "";
    for (const team of comp.competitors ?? []) {
      const abbr = (team.team?.abbreviation ?? "").toUpperCase();
      if (team.homeAway === "home") homeAbbr = abbr;
      else awayAbbr = abbr;
    }
    if (!awayAbbr || !homeAbbr) continue;
    events.push({
      id: event.id,
      date: (event.date ?? "").slice(0, 10),
      status: event.status?.type?.name ?? "",
      awayAbbr,
      homeAbbr,
    });
  }
  return events;
}

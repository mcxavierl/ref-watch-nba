import type { RefOfficial } from "../../src/lib/types";

const SUMMARY_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/summary";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function yyyymmdd(isoDate: string): string {
  return isoDate.slice(0, 10).replace(/-/g, "");
}

export function normalizeOfficialName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard?dates=${yyyymmddDate}`,
  );
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

export async function fetchWnbaSummaryOfficials(
  eventId: string,
): Promise<{ fullName: string; positionName?: string }[]> {
  const res = await fetch(`${SUMMARY_BASE}?event=${eventId}`);
  if (!res.ok) return [];
  const body = (await res.json()) as {
    gameInfo?: {
      officials?: {
        fullName?: string;
        displayName?: string;
        position?: { name?: string; displayName?: string };
      }[];
    };
  };

  return (body.gameInfo?.officials ?? [])
    .map((official) => ({
      fullName: (official.fullName ?? official.displayName ?? "").trim(),
      positionName: official.position?.displayName ?? official.position?.name,
    }))
    .filter((official) => official.fullName.length > 0);
}

function roleFromPosition(positionName: string | undefined, index: number): RefOfficial["role"] {
  const normalized = (positionName ?? "").toLowerCase();
  if (normalized.includes("crew")) return "crew_chief";
  if (normalized.includes("umpire")) return "umpire";
  if (normalized.includes("referee")) return "referee";
  const fallback: RefOfficial["role"][] = ["crew_chief", "referee", "umpire", "alternate"];
  return fallback[index] ?? "alternate";
}

export function toWnbaOfficials(
  officials: { fullName: string; positionName?: string }[],
  roster: Map<string, number>,
): RefOfficial[] {
  return officials
    .map((official, index) => {
      const name = official.fullName.trim();
      if (!name) return null;
      return {
        name,
        number: roster.get(normalizeOfficialName(name)) ?? 0,
        role: roleFromPosition(official.positionName, index),
      };
    })
    .filter((official): official is RefOfficial => official !== null);
}

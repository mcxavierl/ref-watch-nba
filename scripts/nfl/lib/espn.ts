import type { RefOfficial, RefRole } from "../../../src/lib/types";

const ESPN_ABBR: Record<string, string> = {
  WSH: "WAS",
};

export function normalizeEspnAbbr(abbr: string): string {
  return ESPN_ABBR[abbr.toUpperCase()] ?? abbr.toUpperCase();
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim();
}

const ROLE_MAP: Record<string, RefRole> = {
  referee: "referee",
  umpire: "umpire",
  "down judge": "down_judge",
  downjudge: "down_judge",
  "line judge": "line_judge",
  linejudge: "line_judge",
  "field judge": "field_judge",
  fieldjudge: "field_judge",
  "side judge": "side_judge",
  sidejudge: "side_judge",
  "back judge": "back_judge",
  backjudge: "back_judge",
};

export function mapEspnRole(positionName: string): RefRole {
  const key = positionName.toLowerCase().replace(/\s+/g, " ").trim();
  return ROLE_MAP[key.replace(/\s/g, "")] ?? ROLE_MAP[key] ?? "referee";
}

export interface EspnScoreboardEvent {
  id: string;
  date: string;
  name: string;
  status: string;
  awayAbbr: string;
  homeAbbr: string;
  awayScore?: number;
  homeScore?: number;
}

export interface EspnOfficial {
  fullName: string;
  positionName: string;
}

export interface EspnGameSummary {
  gameId: string;
  date: string;
  awayAbbr: string;
  homeAbbr: string;
  awayScore: number;
  homeScore: number;
  homeFlags: number;
  awayFlags: number;
  homePenaltyYards: number;
  awayPenaltyYards: number;
  officials: EspnOfficial[];
  status: string;
}

function parsePenaltyDisplay(value: string): { flags: number; yards: number } {
  const [flagsRaw, yardsRaw] = value.split("-");
  return {
    flags: Number.parseInt(flagsRaw ?? "0", 10) || 0,
    yards: Number.parseInt(yardsRaw ?? "0", 10) || 0,
  };
}

export async function fetchEspnScoreboard(
  yyyymmdd: string,
): Promise<EspnScoreboardEvent[]> {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${yyyymmdd}`,
  );
  if (!res.ok) {
    throw new Error(`ESPN scoreboard ${yyyymmdd}: ${res.status}`);
  }
  const body = (await res.json()) as {
    events?: {
      id: string;
      date: string;
      name: string;
      status?: { type?: { name?: string; completed?: boolean } };
      competitions?: {
        competitors?: {
          homeAway: string;
          score?: string;
          team?: { abbreviation?: string };
        }[];
      }[];
    }[];
  };

  const events: EspnScoreboardEvent[] = [];
  for (const event of body.events ?? []) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    let awayAbbr = "";
    let homeAbbr = "";
    let awayScore: number | undefined;
    let homeScore: number | undefined;
    for (const team of comp.competitors ?? []) {
      const abbr = normalizeEspnAbbr(team.team?.abbreviation ?? "");
      const score = team.score ? Number.parseInt(team.score, 10) : undefined;
      if (team.homeAway === "home") {
        homeAbbr = abbr;
        homeScore = score;
      } else {
        awayAbbr = abbr;
        awayScore = score;
      }
    }
    if (!awayAbbr || !homeAbbr) continue;
    events.push({
      id: event.id,
      date: event.date.slice(0, 10),
      name: event.name,
      status: event.status?.type?.name ?? "UNKNOWN",
      awayAbbr,
      homeAbbr,
      awayScore,
      homeScore,
    });
  }
  return events;
}

export async function fetchEspnSummary(
  gameId: string,
): Promise<EspnGameSummary | null> {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`,
  );
  if (!res.ok) {
    throw new Error(`ESPN summary ${gameId}: ${res.status}`);
  }
  const body = (await res.json()) as {
    header?: {
      competitions?: {
        date?: string;
        status?: { type?: { name?: string } };
        competitors?: {
          homeAway: string;
          score?: string;
          team?: { abbreviation?: string };
        }[];
      }[];
    };
    boxscore?: {
      teams?: {
        team?: { abbreviation?: string };
        statistics?: { name?: string; displayValue?: string }[];
      }[];
    };
    gameInfo?: {
      officials?: { fullName?: string; position?: { name?: string } }[];
    };
  };

  const comp = body.header?.competitions?.[0];
  if (!comp) return null;

  let awayAbbr = "";
  let homeAbbr = "";
  let awayScore = 0;
  let homeScore = 0;
  for (const team of comp.competitors ?? []) {
    const abbr = normalizeEspnAbbr(team.team?.abbreviation ?? "");
    const score = Number.parseInt(team.score ?? "0", 10) || 0;
    if (team.homeAway === "home") {
      homeAbbr = abbr;
      homeScore = score;
    } else {
      awayAbbr = abbr;
      awayScore = score;
    }
  }

  const penaltyByAbbr = new Map<
    string,
    { flags: number; yards: number }
  >();
  for (const team of body.boxscore?.teams ?? []) {
    const abbr = normalizeEspnAbbr(team.team?.abbreviation ?? "");
    const stat = team.statistics?.find((s) => s.name === "totalPenaltiesYards");
    if (abbr && stat?.displayValue) {
      penaltyByAbbr.set(abbr, parsePenaltyDisplay(stat.displayValue));
    }
  }

  const homePen = penaltyByAbbr.get(homeAbbr) ?? { flags: 0, yards: 0 };
  const awayPen = penaltyByAbbr.get(awayAbbr) ?? { flags: 0, yards: 0 };

  const officials: EspnOfficial[] = (body.gameInfo?.officials ?? [])
    .filter((o) => o.fullName && o.position?.name)
    .map((o) => ({
      fullName: o.fullName!,
      positionName: o.position!.name!,
    }));

  return {
    gameId,
    date: (comp.date ?? "").slice(0, 10),
    awayAbbr,
    homeAbbr,
    awayScore,
    homeScore,
    homeFlags: homePen.flags,
    awayFlags: awayPen.flags,
    homePenaltyYards: homePen.yards,
    awayPenaltyYards: awayPen.yards,
    officials,
    status: comp.status?.type?.name ?? "UNKNOWN",
  };
}

export function lookupOfficialNumber(
  name: string,
  roster: Map<string, number>,
): number {
  const key = normalizeName(name);
  const direct = roster.get(key);
  if (direct !== undefined) return direct;

  const parts = key.split(/\s+/);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    for (const [k, num] of roster) {
      if (k.endsWith(` ${last}`) || k.split(" ").pop() === last) {
        return num;
      }
    }
  }
  return 0;
}

export function toRefOfficials(
  officials: EspnOfficial[],
  roster: Map<string, number>,
): RefOfficial[] {
  return officials.map((o) => ({
    name: o.fullName,
    number: lookupOfficialNumber(o.fullName, roster),
    role: mapEspnRole(o.positionName),
  }));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function yyyymmdd(date: string | Date): string {
  const d =
    typeof date === "string" ? new Date(`${date}T12:00:00Z`) : date;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function torontoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function inferNflSeason(date: string): string {
  const year = Number.parseInt(date.slice(0, 4), 10);
  const month = Number.parseInt(date.slice(5, 7), 10);
  const startYear = month >= 3 && month <= 8 ? year - 1 : year;
  const endYear = (startYear + 1) % 100;
  return `${startYear}-${String(endYear).padStart(2, "0")}`;
}

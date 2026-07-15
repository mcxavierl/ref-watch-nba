import { CFB_TEAM_ABBRS } from "../../../src/lib/cfb/teams";
import type { RefOfficial } from "../../../src/lib/types";

const CFB_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/football/college-football";

const TRACKED_ABBRS = new Set(CFB_TEAM_ABBRS);

/** ESPN uses abbreviations that differ from our directory. */
const ESPN_ABBR_ALIASES: Record<string, string> = {
  WASH: "WASH",
  WSU: "WASH",
};

export function normalizeCfbAbbr(abbr: string): string {
  const up = abbr.toUpperCase();
  return ESPN_ABBR_ALIASES[up] ?? up;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^a-z\s]/g, "")
    .trim();
}

/** CFB season label from calendar date (Aug–Jan season). */
export function inferCfbSeason(date: string): string {
  const year = Number.parseInt(date.slice(0, 4), 10);
  const month = Number.parseInt(date.slice(5, 7), 10);
  const startYear = month >= 8 ? year : year - 1;
  const endYear = (startYear + 1) % 100;
  return `${startYear}-${String(endYear).padStart(2, "0")}`;
}

export interface CfbScheduleEvent {
  eventId: string;
  date: string;
  season: string;
  awayAbbr: string;
  homeAbbr: string;
  status: string;
}

export interface CfbGameSummary {
  gameId: string;
  date: string;
  season: string;
  awayAbbr: string;
  homeAbbr: string;
  awayScore: number;
  homeScore: number;
  homeFlags: number;
  awayFlags: number;
  homePenaltyYards: number;
  awayPenaltyYards: number;
  closingTotal: number;
  homeSpread: number;
  lineSource: "external" | "synthetic";
  officials: { fullName: string; positionName?: string }[];
  status: string;
}

function parsePenaltyDisplay(value: string): { flags: number; yards: number } {
  const [flagsRaw, yardsRaw] = value.split("-");
  return {
    flags: Number.parseInt(flagsRaw ?? "0", 10) || 0,
    yards: Number.parseInt(yardsRaw ?? "0", 10) || 0,
  };
}

export async function fetchTeamSchedule(
  teamId: string,
  espnSeasonYear: number,
  seasonType: 2 | 3,
): Promise<CfbScheduleEvent[]> {
  const url =
    `${CFB_BASE}/teams/${teamId}/schedule` +
    `?season=${espnSeasonYear}&seasontype=${seasonType}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN CFB schedule ${teamId} ${espnSeasonYear} t${seasonType}: ${res.status}`);
  }
  const body = (await res.json()) as {
    events?: {
      id: string;
      date?: string;
      season?: { year?: number };
      competitions?: {
        date?: string;
        status?: { type?: { name?: string } };
        competitors?: {
          homeAway: string;
          team?: { abbreviation?: string };
        }[];
      }[];
    }[];
  };

  const out: CfbScheduleEvent[] = [];
  for (const event of body.events ?? []) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    const status = comp.status?.type?.name ?? "";
    if (status !== "STATUS_FINAL") continue;

    let awayAbbr = "";
    let homeAbbr = "";
    for (const team of comp.competitors ?? []) {
      const abbr = normalizeCfbAbbr(team.team?.abbreviation ?? "");
      if (team.homeAway === "home") homeAbbr = abbr;
      else awayAbbr = abbr;
    }
    if (!awayAbbr || !homeAbbr) continue;
    if (!TRACKED_ABBRS.has(awayAbbr) && !TRACKED_ABBRS.has(homeAbbr)) continue;

    const seasonYear = event.season?.year ?? espnSeasonYear;
    out.push({
      eventId: event.id,
      date: (comp.date ?? event.date ?? "").slice(0, 10),
      season: inferCfbSeason(
        (comp.date ?? event.date ?? `${espnSeasonYear}-09-01`).slice(0, 10),
      ),
      awayAbbr,
      homeAbbr,
      status,
    });
  }
  return out;
}

export async function fetchCfbSummary(
  eventId: string,
  fallbackSeason: string,
): Promise<CfbGameSummary | null> {
  const res = await fetch(`${CFB_BASE}/summary?event=${eventId}`);
  if (!res.ok) return null;
  const body = (await res.json()) as {
    header?: {
      competitions?: {
        date?: string;
        season?: { year?: number };
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
      officials?: { fullName?: string; displayName?: string; position?: { name?: string } }[];
    };
    pickcenter?: { overUnder?: number; spread?: number }[];
  };

  const comp = body.header?.competitions?.[0];
  if (!comp) return null;
  const status = comp.status?.type?.name ?? "";
  if (status !== "STATUS_FINAL") return null;

  let awayAbbr = "";
  let homeAbbr = "";
  let awayScore = 0;
  let homeScore = 0;
  for (const team of comp.competitors ?? []) {
    const abbr = normalizeCfbAbbr(team.team?.abbreviation ?? "");
    const score = Number.parseInt(team.score ?? "0", 10) || 0;
    if (team.homeAway === "home") {
      homeAbbr = abbr;
      homeScore = score;
    } else {
      awayAbbr = abbr;
      awayScore = score;
    }
  }
  if (!awayAbbr || !homeAbbr) return null;

  const penaltyByAbbr = new Map<string, { flags: number; yards: number }>();
  for (const team of body.boxscore?.teams ?? []) {
    const abbr = normalizeCfbAbbr(team.team?.abbreviation ?? "");
    const stat = team.statistics?.find((s) => s.name === "totalPenaltiesYards");
    if (abbr && stat?.displayValue) {
      penaltyByAbbr.set(abbr, parsePenaltyDisplay(stat.displayValue));
    }
  }

  const homePen = penaltyByAbbr.get(homeAbbr) ?? { flags: 0, yards: 0 };
  const awayPen = penaltyByAbbr.get(awayAbbr) ?? { flags: 0, yards: 0 };

  const pick = body.pickcenter?.[0];
  const closingTotal =
    pick?.overUnder !== undefined && Number.isFinite(pick.overUnder)
      ? pick.overUnder
      : 52;
  const homeSpread =
    pick?.spread !== undefined && Number.isFinite(pick.spread) ? pick.spread : 0;

  const officials = (body.gameInfo?.officials ?? [])
    .map((o) => ({
      fullName: (o.fullName ?? o.displayName ?? "").replace(/\s+/g, " ").trim(),
      positionName: o.position?.name,
    }))
    .filter((o) => o.fullName.length > 0);

  const date = (comp.date ?? "").slice(0, 10);
  const season =
    date.length >= 4 ? inferCfbSeason(date) : fallbackSeason;

  return {
    gameId: eventId,
    date,
    season,
    awayAbbr,
    homeAbbr,
    awayScore,
    homeScore,
    homeFlags: homePen.flags,
    awayFlags: awayPen.flags,
    homePenaltyYards: homePen.yards,
    awayPenaltyYards: awayPen.yards,
    closingTotal,
    homeSpread,
    lineSource: pick?.overUnder !== undefined ? "external" : "synthetic",
    officials,
    status,
  };
}

export function assignOfficialNumber(
  name: string,
  roster: Map<string, number>,
): number {
  const key = normalizeName(name);
  const existing = roster.get(key);
  if (existing !== undefined) return existing;
  const next = roster.size + 1;
  roster.set(key, next);
  return next;
}

export function toCfbOfficials(
  officials: { fullName: string; positionName?: string }[],
  roster: Map<string, number>,
): RefOfficial[] {
  return officials.map((o) => {
    const number = assignOfficialNumber(o.fullName, roster);
    const role =
      o.positionName?.toLowerCase().includes("referee") ||
      o.positionName?.toLowerCase() === "r"
        ? "referee"
        : "referee";
    return {
      name: o.fullName,
      number,
      role,
    };
  });
}

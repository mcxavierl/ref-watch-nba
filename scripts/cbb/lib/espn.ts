import type { RefOfficial } from "../../../src/lib/types";
import { CBB_TEAM_ABBRS } from "../../../src/lib/cbb/teams";

const SCOREBOARD_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball";

const TRACKED_ABBRS = new Set(CBB_TEAM_ABBRS);

/** ESPN uses CONN; our directory uses UCONN. */
const ESPN_ABBR_ALIASES: Record<string, string> = {
  CONN: "UCONN",
};

export function normalizeCbbAbbr(abbr: string): string {
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

export function inferCbbSeason(espnSeasonYear: number): string {
  const start = espnSeasonYear - 1;
  const end = espnSeasonYear % 100;
  return `${start}-${String(end).padStart(2, "0")}`;
}

export interface CbbScheduleEvent {
  eventId: string;
  date: string;
  season: string;
  awayAbbr: string;
  homeAbbr: string;
  status: string;
}

export interface CbbGameSummary {
  gameId: string;
  date: string;
  season: string;
  awayAbbr: string;
  homeAbbr: string;
  awayScore: number;
  homeScore: number;
  homeFouls: number;
  awayFouls: number;
  closingTotal: number;
  homeSpread: number;
  lineSource: "external" | "synthetic";
  officials: { fullName: string }[];
  status: string;
}

function parseStat(
  stats: { name?: string; displayValue?: string }[] | undefined,
  name: string,
): number {
  const row = stats?.find((s) => s.name === name);
  if (!row?.displayValue) return 0;
  const n = Number.parseFloat(row.displayValue);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchTeamSchedule(
  teamId: string,
  espnSeasonYear: number,
  seasonType: 2 | 3,
): Promise<CbbScheduleEvent[]> {
  const url =
    `${SCOREBOARD_BASE}/teams/${teamId}/schedule` +
    `?season=${espnSeasonYear}&seasontype=${seasonType}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN CBB schedule ${teamId} ${espnSeasonYear} t${seasonType}: ${res.status}`);
  }
  const body = (await res.json()) as {
    events?: {
      id: string;
      date?: string;
      season?: { year?: number };
      seasonType?: { type?: number };
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

  const out: CbbScheduleEvent[] = [];
  for (const event of body.events ?? []) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    const status = comp.status?.type?.name ?? "";
    if (status !== "STATUS_FINAL") continue;

    let awayAbbr = "";
    let homeAbbr = "";
    for (const team of comp.competitors ?? []) {
      const abbr = normalizeCbbAbbr(team.team?.abbreviation ?? "");
      if (team.homeAway === "home") homeAbbr = abbr;
      else awayAbbr = abbr;
    }
    if (!awayAbbr || !homeAbbr) continue;
    if (!TRACKED_ABBRS.has(awayAbbr) && !TRACKED_ABBRS.has(homeAbbr)) continue;

    const seasonYear = event.season?.year ?? espnSeasonYear;
    out.push({
      eventId: event.id,
      date: (comp.date ?? event.date ?? "").slice(0, 10),
      season: inferCbbSeason(seasonYear),
      awayAbbr,
      homeAbbr,
      status,
    });
  }
  return out;
}

export async function fetchCbbSummary(
  eventId: string,
  fallbackSeason: string,
): Promise<CbbGameSummary | null> {
  const res = await fetch(`${SCOREBOARD_BASE}/summary?event=${eventId}`);
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
      officials?: { fullName?: string; displayName?: string; order?: number }[];
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
    const abbr = normalizeCbbAbbr(team.team?.abbreviation ?? "");
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

  const statsByAbbr = new Map<
    string,
    { name?: string; displayValue?: string }[]
  >();
  for (const team of body.boxscore?.teams ?? []) {
    const abbr = normalizeCbbAbbr(team.team?.abbreviation ?? "");
    if (abbr) statsByAbbr.set(abbr, team.statistics ?? []);
  }

  const homeStats = statsByAbbr.get(homeAbbr) ?? [];
  const awayStats = statsByAbbr.get(awayAbbr) ?? [];

  const pick = body.pickcenter?.[0];
  const closingTotal =
    pick?.overUnder !== undefined && Number.isFinite(pick.overUnder)
      ? pick.overUnder
      : 145;
  const homeSpread =
    pick?.spread !== undefined && Number.isFinite(pick.spread) ? pick.spread : 0;

  const officials = (body.gameInfo?.officials ?? [])
    .map((o) => ({
      fullName: (o.fullName ?? o.displayName ?? "").replace(/\s+/g, " ").trim(),
    }))
    .filter((o) => o.fullName.length > 0);

  const seasonYear = comp.season?.year;
  const season =
    seasonYear !== undefined ? inferCbbSeason(seasonYear) : fallbackSeason;

  return {
    gameId: eventId,
    date: (comp.date ?? "").slice(0, 10),
    season,
    awayAbbr,
    homeAbbr,
    awayScore,
    homeScore,
    homeFouls: parseStat(homeStats, "fouls"),
    awayFouls: parseStat(awayStats, "fouls"),
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

export function toCbbOfficials(
  officials: { fullName: string }[],
  roster: Map<string, number>,
): RefOfficial[] {
  return officials.map((o) => {
    const number = assignOfficialNumber(o.fullName, roster);
    return {
      name: o.fullName,
      number,
      role: "referee" as const,
    };
  });
}

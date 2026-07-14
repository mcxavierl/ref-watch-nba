import type { RefOfficial } from "../../../src/lib/types";

const SCOREBOARD_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1";
const CORE_EVENTS_BASE =
  "https://sports.core.api.espn.com/v2/sports/soccer/leagues/esp.1";

export function normalizeLaligaAbbr(abbr: string): string {
  return abbr.toUpperCase();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim();
}

export function inferLaligaSeason(espnSeasonYear: number): string {
  const start = espnSeasonYear;
  const end = (espnSeasonYear + 1) % 100;
  return `${start}-${String(end).padStart(2, "0")}`;
}

export interface LaligaGameSummary {
  gameId: string;
  date: string;
  season: string;
  awayAbbr: string;
  homeAbbr: string;
  awayScore: number;
  homeScore: number;
  homeFouls: number;
  awayFouls: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
  homePenalties: number;
  awayPenalties: number;
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

export async function fetchSeasonEventIds(
  espnSeasonYear: number,
): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const url =
      `${CORE_EVENTS_BASE}/seasons/${espnSeasonYear}/types/1/events` +
      `?limit=100&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`ESPN season events ${espnSeasonYear} p${page}: ${res.status}`);
    }
    const body = (await res.json()) as {
      count?: number;
      pageCount?: number;
      items?: { $ref?: string }[];
    };
    pageCount = body.pageCount ?? 1;
    for (const item of body.items ?? []) {
      const ref = item.$ref ?? "";
      const match = ref.match(/\/events\/(\d+)/);
      if (match?.[1]) ids.push(match[1]);
    }
    page++;
    await sleep(40);
  }

  return ids;
}

export async function fetchLaligaSummary(
  eventId: string,
  espnSeasonYear: number,
): Promise<LaligaGameSummary | null> {
  const res = await fetch(`${SCOREBOARD_BASE}/summary?event=${eventId}`);
  if (!res.ok) return null;
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
      officials?: { fullName?: string; displayName?: string }[];
    };
    pickcenter?: { overUnder?: number; spread?: number }[];
  };

  const comp = body.header?.competitions?.[0];
  if (!comp) return null;

  const status = comp.status?.type?.name ?? "";
  if (status !== "STATUS_FULL_TIME") return null;

  let awayAbbr = "";
  let homeAbbr = "";
  let awayScore = 0;
  let homeScore = 0;
  for (const team of comp.competitors ?? []) {
    const abbr = normalizeLaligaAbbr(team.team?.abbreviation ?? "");
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
    const abbr = normalizeLaligaAbbr(team.team?.abbreviation ?? "");
    if (abbr) statsByAbbr.set(abbr, team.statistics ?? []);
  }

  const homeStats = statsByAbbr.get(homeAbbr) ?? [];
  const awayStats = statsByAbbr.get(awayAbbr) ?? [];

  const pick = body.pickcenter?.[0];
  const closingTotal =
    pick?.overUnder !== undefined && Number.isFinite(pick.overUnder)
      ? pick.overUnder
      : 2.5;
  const homeSpread =
    pick?.spread !== undefined && Number.isFinite(pick.spread) ? pick.spread : 0;

  const officials = (body.gameInfo?.officials ?? [])
    .map((o) => ({
      fullName: (o.fullName ?? o.displayName ?? "").trim(),
    }))
    .filter((o) => o.fullName.length > 0);

  return {
    gameId: eventId,
    date: (comp.date ?? "").slice(0, 10),
    season: inferLaligaSeason(espnSeasonYear),
    awayAbbr,
    homeAbbr,
    awayScore,
    homeScore,
    homeFouls: parseStat(homeStats, "foulsCommitted"),
    awayFouls: parseStat(awayStats, "foulsCommitted"),
    homeYellowCards: parseStat(homeStats, "yellowCards"),
    awayYellowCards: parseStat(awayStats, "yellowCards"),
    homeRedCards: parseStat(homeStats, "redCards"),
    awayRedCards: parseStat(awayStats, "redCards"),
    homePenalties: parseStat(homeStats, "penaltyKickShots"),
    awayPenalties: parseStat(awayStats, "penaltyKickShots"),
    closingTotal,
    homeSpread,
    lineSource: pick?.overUnder !== undefined ? "external" : "synthetic",
    officials,
    status,
  };
}

export function toLaligaOfficials(
  officials: { fullName: string }[],
  roster: Map<string, number>,
): RefOfficial[] {
  return officials.map((o) => {
    const key = normalizeName(o.fullName);
    return {
      name: o.fullName,
      number: roster.get(key) ?? 0,
      role: "referee" as const,
    };
  });
}

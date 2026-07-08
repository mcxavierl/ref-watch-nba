import * as fs from "node:fs";
import * as path from "node:path";
import { NBA_STATS_HEADERS } from "../lib/nba-headers";
import {
  INGEST_LOG_PATH,
  NBA_STATS_BASE,
  NBA_STATS_RATE_MS,
  type IngestSeason,
} from "./config";

interface NbaResultSet {
  name: string;
  headers: string[];
  rowSet: unknown[][];
}

interface NbaResponse {
  resultSets: NbaResultSet[];
}

export interface NbaStatsGame {
  gameId: string;
  date: string;
  season: IngestSeason;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

export interface NbaOfficial {
  name: string;
  number: number;
}

let lastRequestAt = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const wait = NBA_STATS_RATE_MS - (now - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

function resultSet(
  data: NbaResponse,
  name: string,
): { headers: string[]; rows: unknown[][] } | null {
  const set = data.resultSets.find((r) => r.name === name);
  if (!set) return null;
  return { headers: set.headers, rows: set.rowSet };
}

function rowValue(
  headers: string[],
  row: unknown[],
  key: string,
): string | number | null {
  const idx = headers.indexOf(key);
  if (idx < 0) return null;
  const val = row[idx];
  if (typeof val === "string" || typeof val === "number") return val;
  return null;
}

export async function nbaStatsFetch(
  endpoint: string,
  params: Record<string, string>,
): Promise<NbaResponse | null> {
  const qs = new URLSearchParams(params).toString();
  const url = `${NBA_STATS_BASE}/${endpoint}?${qs}`;

  await rateLimit();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, {
      headers: NBA_STATS_HEADERS,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as NbaResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSeasonGameIds(season: IngestSeason): Promise<string[]> {
  const data = await nbaStatsFetch("leaguegamefinder", {
    LeagueID: "00",
    Season: season,
    SeasonType: "Regular Season",
    PlayerOrTeam: "T",
  });
  if (!data) return [];

  const rs = resultSet(data, "LeagueGameFinderResults");
  if (!rs) return [];

  const ids = new Set<string>();
  for (const row of rs.rows) {
    const gameId = rowValue(rs.headers, row, "GAME_ID");
    if (typeof gameId === "string") ids.add(gameId);
  }
  return [...ids];
}

function parseNbaGameDate(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return "";
}

export async function fetchGameSummary(
  gameId: string,
): Promise<{
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  officials: NbaOfficial[];
  httpStatus: number;
} | null> {
  await rateLimit();

  const url = `${NBA_STATS_BASE}/boxscoresummaryv2?GameID=${gameId}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, {
      headers: NBA_STATS_HEADERS,
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        date: "",
        homeTeam: "",
        awayTeam: "",
        homeScore: 0,
        awayScore: 0,
        officials: [],
        httpStatus: res.status,
      };
    }

    const data = (await res.json()) as NbaResponse;
    const lineScore = resultSet(data, "LineScore");
    const gameInfo = resultSet(data, "GameInfo");
    const officialsRs = resultSet(data, "Officials");

    let date = "";
    if (gameInfo?.rows[0]) {
      const gd =
        rowValue(gameInfo.headers, gameInfo.rows[0], "GAME_DATE_EST") ??
        rowValue(gameInfo.headers, gameInfo.rows[0], "GAME_DATE");
      if (typeof gd === "string") date = parseNbaGameDate(gd);
    }

    let homeTeam = "";
    let awayTeam = "";
    let homeScore = 0;
    let awayScore = 0;

    if (lineScore) {
      for (const row of lineScore.rows) {
        const abbr = rowValue(lineScore.headers, row, "TEAM_ABBREVIATION");
        const pts = rowValue(lineScore.headers, row, "PTS");
        const ha = rowValue(lineScore.headers, row, "TEAM_ID");
        if (typeof abbr !== "string") continue;
        const points = typeof pts === "number" ? pts : 0;
        const isHome = ha === lineScore.rows[1]?.[lineScore.headers.indexOf("TEAM_ID")];
        // LineScore order: away first, home second typically
        const matchup = rowValue(lineScore.headers, row, "TEAM_CITY_NAME");
        void matchup;
      }
      // Standard order in LineScore: visitor index 0, home index 1
      if (lineScore.rows.length >= 2) {
        awayTeam =
          (rowValue(lineScore.headers, lineScore.rows[0]!, "TEAM_ABBREVIATION") as string) ?? "";
        homeTeam =
          (rowValue(lineScore.headers, lineScore.rows[1]!, "TEAM_ABBREVIATION") as string) ?? "";
        awayScore =
          (rowValue(lineScore.headers, lineScore.rows[0]!, "PTS") as number) ?? 0;
        homeScore =
          (rowValue(lineScore.headers, lineScore.rows[1]!, "PTS") as number) ?? 0;
      }
    }

    const officials: NbaOfficial[] = [];
    if (officialsRs) {
      for (const row of officialsRs.rows) {
        const first = rowValue(officialsRs.headers, row, "FIRST_NAME");
        const last =
          rowValue(officialsRs.headers, row, "FAMILY_NAME") ??
          rowValue(officialsRs.headers, row, "LAST_NAME");
        const num = rowValue(officialsRs.headers, row, "JERSEY_NUM");
        if (typeof first !== "string" || typeof last !== "string") continue;
        const number =
          typeof num === "number"
            ? num
            : typeof num === "string"
              ? Number.parseInt(num.trim(), 10) || 0
              : 0;
        officials.push({ name: `${first} ${last}`.trim(), number });
      }
    }

    return {
      date,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      officials,
      httpStatus: res.status,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function appendIngestLog(entry: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(INGEST_LOG_PATH), { recursive: true });
  fs.appendFileSync(INGEST_LOG_PATH, `${JSON.stringify(entry)}\n`);
}

import { NBA_STATS_HEADERS } from "../lib/nba-headers";
import { NBA_STATS_BASE, NBA_STATS_RATE_MS } from "./config";
import type { BoxscoreFouls } from "./parse-boxscore-fouls";

interface NbaResultSet {
  name: string;
  headers: string[];
  rowSet: unknown[][];
}

interface NbaResponse {
  resultSets: NbaResultSet[];
}

let lastRequestAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const wait = NBA_STATS_RATE_MS - (now - lastRequestAt);
  if (wait > 0) await sleep(wait);
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

export async function fetchNbaBoxFouls(
  gameId: string,
  homeTeam: string,
  awayTeam: string,
): Promise<BoxscoreFouls | null> {
  await rateLimit();

  const url = `${NBA_STATS_BASE}/boxscoretraditionalv2?GameID=${gameId}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(url, {
      headers: NBA_STATS_HEADERS,
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as NbaResponse;
    const teamStats = resultSet(data, "TeamStats");
    if (!teamStats || teamStats.rows.length < 2) return null;

    let homeFouls: number | null = null;
    let awayFouls: number | null = null;

    for (const row of teamStats.rows) {
      const abbr = rowValue(teamStats.headers, row, "TEAM_ABBREVIATION");
      const pfRaw = rowValue(teamStats.headers, row, "PF");
      if (typeof abbr !== "string") continue;
      const pf =
        typeof pfRaw === "number"
          ? pfRaw
          : typeof pfRaw === "string"
            ? Number.parseInt(pfRaw, 10)
            : NaN;
      if (!Number.isFinite(pf)) continue;

      if (abbr === homeTeam) homeFouls = pf;
      else if (abbr === awayTeam) awayFouls = pf;
    }

    if (homeFouls === null || awayFouls === null) return null;
    return { homeFouls, awayFouls };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

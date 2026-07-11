import type { GameOddsLine } from "../../../src/lib/types";

export const NFLVERSE_GAMES_URL =
  "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";

/** Map nflverse historical abbreviations to Ref Watch NFL team codes. */
const NFLVERSE_TEAM: Record<string, string> = {
  LA: "LAR",
  OAK: "LV",
  SD: "LAC",
  STL: "LAR",
  JAC: "JAX",
  WSH: "WAS",
};

export function normalizeNflverseTeam(abbr: string): string {
  const upper = abbr.trim().toUpperCase();
  return NFLVERSE_TEAM[upper] ?? upper;
}

export interface NflClosingLine {
  gameId?: string;
  espnId?: string;
  date: string;
  awayTeam: string;
  homeTeam: string;
  total: number;
  homeSpread: number;
  source: "nflverse";
}

export interface NflverseLineIndex {
  byEspnId: Map<string, NflClosingLine>;
  byMatchup: Map<string, NflClosingLine>;
  lines: NflClosingLine[];
}

function matchupKey(date: string, awayTeam: string, homeTeam: string): string {
  return `${date}|${awayTeam}|${homeTeam}`;
}

/** nflverse spread_line: positive when home is favored → US homeSpread is negative. */
export function nflverseHomeSpread(spreadLine: number): number {
  return -spreadLine;
}

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current);
  return fields;
}

export function buildNflverseLineIndex(
  csv: string,
  minSeason = 2021,
): NflverseLineIndex {
  const rows = csv.trim().split("\n");
  const header = parseCsvRow(rows[0] ?? "");
  const idx = (name: string) => header.indexOf(name);

  const seasonI = idx("season");
  const typeI = idx("game_type");
  const dateI = idx("gameday");
  const awayI = idx("away_team");
  const homeI = idx("home_team");
  const spreadI = idx("spread_line");
  const totalI = idx("total_line");
  const espnI = idx("espn");

  const byEspnId = new Map<string, NflClosingLine>();
  const byMatchup = new Map<string, NflClosingLine>();
  const lines: NflClosingLine[] = [];

  for (let r = 1; r < rows.length; r++) {
    const fields = parseCsvRow(rows[r] ?? "");
    const season = Number(fields[seasonI]);
    const gameType = fields[typeI];
    if (!Number.isFinite(season) || season < minSeason) continue;
    if (gameType !== "REG" && gameType !== "POST") continue;

    const spreadRaw = Number(fields[spreadI]);
    const totalRaw = Number(fields[totalI]);
    if (!Number.isFinite(spreadRaw) || !Number.isFinite(totalRaw)) continue;

    const awayTeam = normalizeNflverseTeam(fields[awayI] ?? "");
    const homeTeam = normalizeNflverseTeam(fields[homeI] ?? "");
    const date = fields[dateI] ?? "";
    if (!awayTeam || !homeTeam || !date) continue;

    const espnRaw = fields[espnI]?.trim();
    const espnId =
      espnRaw && espnRaw !== "NA" && espnRaw !== "" ? espnRaw : undefined;

    const entry: NflClosingLine = {
      gameId: espnId,
      espnId,
      date,
      awayTeam,
      homeTeam,
      total: totalRaw,
      homeSpread: nflverseHomeSpread(spreadRaw),
      source: "nflverse",
    };

    lines.push(entry);
    byMatchup.set(matchupKey(date, awayTeam, homeTeam), entry);
    if (espnId) byEspnId.set(espnId, entry);
  }

  return { byEspnId, byMatchup, lines };
}

export function lookupNflLine(
  index: NflverseLineIndex,
  game: {
    gameId: string;
    date: string;
    awayTeam: string;
    homeTeam: string;
  },
): NflClosingLine | undefined {
  const byEspn = index.byEspnId.get(game.gameId);
  if (byEspn) return byEspn;
  return index.byMatchup.get(
    matchupKey(game.date, game.awayTeam, game.homeTeam),
  );
}

export async function fetchNflverseGamesCsv(): Promise<string> {
  const res = await fetch(NFLVERSE_GAMES_URL);
  if (!res.ok) {
    throw new Error(`nflverse games.csv fetch failed: ${res.status}`);
  }
  return res.text();
}

export function toGameOddsLines(lines: NflClosingLine[]): GameOddsLine[] {
  return lines.map((line) => ({
    gameId: line.espnId ?? `${line.date}|${line.awayTeam}|${line.homeTeam}`,
    awayTeam: line.awayTeam,
    homeTeam: line.homeTeam,
    total: line.total,
    homeSpread: line.homeSpread,
    source: "nflverse",
    lastUpdated: new Date().toISOString(),
  }));
}

export interface NflverseScheduleGame {
  espnId?: string;
  date: string;
  awayTeam: string;
  homeTeam: string;
  season: number;
  /** Head referee from nflverse games.csv (fallback when ESPN has no crew). */
  referee?: string;
}

/** Complete REG/POST schedule rows from nflverse (for gap-fill backfill). */
export function listNflverseScheduleGames(
  csv: string,
  options: { minSeason?: number; maxSeason?: number } = {},
): NflverseScheduleGame[] {
  const minSeason = options.minSeason ?? 2016;
  const maxSeason = options.maxSeason ?? 2026;
  const rows = csv.trim().split("\n");
  const header = parseCsvRow(rows[0] ?? "");
  const idx = (name: string) => header.indexOf(name);

  const seasonI = idx("season");
  const typeI = idx("game_type");
  const dateI = idx("gameday");
  const awayI = idx("away_team");
  const homeI = idx("home_team");
  const espnI = idx("espn");
  const refereeI = idx("referee");

  const games: NflverseScheduleGame[] = [];
  for (let r = 1; r < rows.length; r++) {
    const fields = parseCsvRow(rows[r] ?? "");
    const season = Number(fields[seasonI]);
    const gameType = fields[typeI];
    if (!Number.isFinite(season) || season < minSeason || season > maxSeason) {
      continue;
    }
    if (gameType !== "REG" && gameType !== "POST") continue;

    const awayTeam = normalizeNflverseTeam(fields[awayI] ?? "");
    const homeTeam = normalizeNflverseTeam(fields[homeI] ?? "");
    const date = fields[dateI] ?? "";
    if (!awayTeam || !homeTeam || !date) continue;

    const espnRaw = fields[espnI]?.trim();
    const espnId =
      espnRaw && espnRaw !== "NA" && espnRaw !== "" ? espnRaw : undefined;
    const refereeRaw = fields[refereeI]?.trim();
    const referee =
      refereeRaw && refereeRaw !== "NA" && refereeRaw !== ""
        ? refereeRaw
        : undefined;

    games.push({ espnId, date, awayTeam, homeTeam, season, referee });
  }
  return games;
}

export function nflverseMatchupKey(
  date: string,
  awayTeam: string,
  homeTeam: string,
): string {
  return matchupKey(date, awayTeam, homeTeam);
}

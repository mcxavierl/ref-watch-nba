import * as fs from "node:fs";
import * as path from "node:path";
import type { RefRole } from "../../../src/lib/types";
import { canonicalizeOfficialName } from "./official-names";
import {
  buildNflverseLineIndex,
  fetchNflverseGamesCsv,
  lookupNflLine,
  nflverseHomeSpread,
  nflverseMatchupKey,
  normalizeNflverseTeam,
  type NflverseLineIndex,
} from "./nflverse-lines";
import type { NflPenaltyGameIndex } from "./nflverse-penalties";

export type NflHistoricalGameLogEntry = {
  gameId: string;
  date: string;
  season: string;
  league: "NFL";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  totalFouls: number;
  homeFlags: number;
  awayFlags: number;
  homePenaltyYards: number;
  awayPenaltyYards: number;
  closingTotal: number;
  homeSpread: number;
  lineSource: "external" | "synthetic";
  officials: { name: string; number: number; role: RefRole }[];
};

const NFL_TEAM_ABBRS = new Set([
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN",
  "DET", "GB", "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA",
  "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB",
  "TEN", "WAS",
]);

const LEAGUE_OVER_BASELINE = 46;

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

export function nflSeasonLabelFromStartYear(startYear: number): string {
  const endYear = (startYear + 1) % 100;
  return `${startYear}-${String(endYear).padStart(2, "0")}`;
}

export function loadNflverseGamesCsvCached(dataDir: string): string {
  const cachePath = path.join(dataDir, "nflverse-games.csv");
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, "utf8");
  }
  throw new Error("nflverse-games.csv missing — run build-nfl-data first");
}

export async function ensureNflverseGamesCsv(dataDir: string): Promise<string> {
  const cachePath = path.join(dataDir, "nflverse-games.csv");
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, "utf8");
  }
  console.log("Fetching nflverse games.csv…");
  const csv = await fetchNflverseGamesCsv();
  fs.writeFileSync(cachePath, csv);
  return csv;
}

export function listHistoricalNflverseGames(
  csv: string,
  options: { minSeason?: number; maxSeason?: number } = {},
): Array<{
  gameId: string;
  espnId?: string;
  date: string;
  awayTeam: string;
  homeTeam: string;
  awayScore: number;
  homeScore: number;
  seasonStart: number;
  seasonLabel: string;
  referee?: string;
  totalLine?: number;
  spreadLine?: number;
}> {
  const minSeason = options.minSeason ?? 2000;
  const maxSeason = options.maxSeason ?? 2015;
  const rows = csv.trim().split("\n");
  const header = parseCsvRow(rows[0] ?? "");
  const idx = (name: string) => header.indexOf(name);

  const gameIdI = idx("game_id");
  const seasonI = idx("season");
  const typeI = idx("game_type");
  const dateI = idx("gameday");
  const awayI = idx("away_team");
  const homeI = idx("home_team");
  const awayScoreI = idx("away_score");
  const homeScoreI = idx("home_score");
  const espnI = idx("espn");
  const refereeI = idx("referee");
  const totalLineI = idx("total_line");
  const spreadLineI = idx("spread_line");

  const games = [];

  for (let r = 1; r < rows.length; r++) {
    const fields = parseCsvRow(rows[r] ?? "");
    const seasonStart = Number(fields[seasonI]);
    const gameType = fields[typeI];
    if (!Number.isFinite(seasonStart) || seasonStart < minSeason || seasonStart > maxSeason) {
      continue;
    }
    if (gameType !== "REG" && gameType !== "POST") continue;

    const awayTeam = normalizeNflverseTeam(fields[awayI] ?? "");
    const homeTeam = normalizeNflverseTeam(fields[homeI] ?? "");
    const date = fields[dateI] ?? "";
    const gameId = fields[gameIdI]?.trim();
    if (!awayTeam || !homeTeam || !date || !gameId) continue;
    if (!NFL_TEAM_ABBRS.has(awayTeam) || !NFL_TEAM_ABBRS.has(homeTeam)) continue;

    const awayScore = Number(fields[awayScoreI]);
    const homeScore = Number(fields[homeScoreI]);
    if (!Number.isFinite(awayScore) || !Number.isFinite(homeScore)) continue;

    const espnRaw = fields[espnI]?.trim();
    const espnId =
      espnRaw && espnRaw !== "NA" && espnRaw !== "" ? espnRaw : undefined;
    const refereeRaw = fields[refereeI]?.trim();
    const referee =
      refereeRaw && refereeRaw !== "NA" && refereeRaw !== "" ? refereeRaw : undefined;

    const totalRaw = Number(fields[totalLineI]);
    const spreadRaw = Number(fields[spreadLineI]);

    games.push({
      gameId,
      espnId,
      date,
      awayTeam,
      homeTeam,
      awayScore,
      homeScore,
      seasonStart,
      seasonLabel: nflSeasonLabelFromStartYear(seasonStart),
      referee,
      totalLine: Number.isFinite(totalRaw) ? totalRaw : undefined,
      spreadLine: Number.isFinite(spreadRaw) ? spreadRaw : undefined,
    });
  }

  return games;
}

export function buildHistoricalLogEntry(
  game: ReturnType<typeof listHistoricalNflverseGames>[number],
  roster: Map<string, number>,
  penaltyIndex: NflPenaltyGameIndex,
  lineIndex: NflverseLineIndex | null,
): NflHistoricalGameLogEntry | null {
  if (!game.referee) return null;

  const head = canonicalizeOfficialName(game.referee, roster);
  const crew = [{ name: head.name, number: head.number, role: "referee" as const }];

  const penalties = penaltyIndex[game.gameId];
  const homeFlags = penalties?.homeFlags ?? 0;
  const awayFlags = penalties?.awayFlags ?? 0;
  const homePenaltyYards = penalties?.homePenaltyYards ?? 0;
  const awayPenaltyYards = penalties?.awayPenaltyYards ?? 0;

  const closingLine = lineIndex
    ? lookupNflLine(lineIndex, {
        gameId: game.espnId,
        date: game.date,
        awayTeam: game.awayTeam,
        homeTeam: game.homeTeam,
      })
    : undefined;

  const closingTotal =
    closingLine?.total ??
    game.totalLine ??
    LEAGUE_OVER_BASELINE;
  const homeSpread =
    closingLine?.homeSpread ??
    (game.spreadLine !== undefined ? nflverseHomeSpread(game.spreadLine) : 0);
  const lineSource =
    closingLine || game.totalLine !== undefined ? ("external" as const) : ("synthetic" as const);

  return {
    gameId: game.espnId ?? game.gameId,
    date: game.date,
    season: game.seasonLabel,
    league: "NFL",
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    totalPoints: game.homeScore + game.awayScore,
    totalFouls: homeFlags + awayFlags,
    homeFlags,
    awayFlags,
    homePenaltyYards,
    awayPenaltyYards,
    closingTotal,
    homeSpread,
    lineSource,
    officials: crew,
  };
}

export async function ingestHistoricalNflverseGames(
  existingById: Map<string, NflHistoricalGameLogEntry>,
  roster: Map<string, number>,
  dataDir: string,
  options: { minSeason?: number; maxSeason?: number } = {},
): Promise<number> {
  const minSeason = options.minSeason ?? 2000;
  const maxSeason = options.maxSeason ?? 2015;

  const csv = await ensureNflverseGamesCsv(dataDir);
  const lineIndex = buildNflverseLineIndex(csv, minSeason);
  const { loadNflversePenaltyIndex } = await import("./nflverse-penalties");
  const penaltyIndex = await loadNflversePenaltyIndex(dataDir, {
    minYear: minSeason,
    maxYear: maxSeason,
  });

  const haveMatchup = new Set(
    [...existingById.values()].map((g) =>
      nflverseMatchupKey(g.date, g.awayTeam, g.homeTeam),
    ),
  );
  const haveId = new Set([...existingById.keys()].map(String));

  const candidates = listHistoricalNflverseGames(csv, { minSeason, maxSeason });
  let added = 0;

  for (const game of candidates) {
    const matchup = nflverseMatchupKey(game.date, game.awayTeam, game.homeTeam);
    if (haveMatchup.has(matchup)) continue;

    const entry = buildHistoricalLogEntry(game, roster, penaltyIndex, lineIndex);
    if (!entry) continue;

    const id = String(entry.gameId);
    if (haveId.has(id)) continue;

    existingById.set(id, entry);
    haveId.add(id);
    haveMatchup.add(matchup);
    added++;
  }

  console.log(
    `Historical nflverse ingest: +${added} games (${minSeason}–${maxSeason}), ${existingById.size} total`,
  );
  return added;
}

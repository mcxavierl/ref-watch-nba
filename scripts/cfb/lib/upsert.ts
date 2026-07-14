import * as fs from "node:fs";
import { EXTRACTED_GAMES_PATH } from "./paths";

export interface CfbExtractedGameRecord {
  gameId: string;
  extractedAt: string;
  season: string;
  awayAbbr: string;
  homeAbbr: string;
  date: string;
  awayScore: number;
  homeScore: number;
  homeFlags: number;
  awayFlags: number;
  homePenaltyYards: number;
  awayPenaltyYards: number;
  closingTotal: number;
  homeSpread: number;
  lineSource: "external" | "synthetic";
  status: string;
  officials: { fullName: string; positionName: string }[];
  contractValid: boolean;
  contractViolations?: { path: string; expected: string; actual: string }[];
}

export interface CfbExtractedGamesFile {
  lastUpdated: string;
  source: "espn";
  gameCount: number;
  games: Record<string, CfbExtractedGameRecord>;
}

export function loadExtractedGames(): CfbExtractedGamesFile {
  if (!fs.existsSync(EXTRACTED_GAMES_PATH)) {
    return {
      lastUpdated: new Date().toISOString(),
      source: "espn",
      gameCount: 0,
      games: {},
    };
  }
  return JSON.parse(fs.readFileSync(EXTRACTED_GAMES_PATH, "utf8")) as CfbExtractedGamesFile;
}

export function saveExtractedGames(file: CfbExtractedGamesFile): void {
  file.gameCount = Object.keys(file.games).length;
  file.lastUpdated = new Date().toISOString();
  fs.mkdirSync(EXTRACTED_GAMES_PATH.replace(/\/[^/]+$/, ""), { recursive: true });
  fs.writeFileSync(EXTRACTED_GAMES_PATH, `${JSON.stringify(file, null, 2)}\n`);
}

/** Idempotent upsert keyed by ESPN game ID. */
export function upsertExtractedGame(
  file: CfbExtractedGamesFile,
  record: CfbExtractedGameRecord,
): boolean {
  const existing = file.games[record.gameId];
  file.games[record.gameId] = {
    ...record,
    extractedAt: new Date().toISOString(),
  };
  return !existing;
}

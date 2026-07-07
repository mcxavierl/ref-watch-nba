import * as fs from "node:fs";
import * as path from "node:path";
import type { RefOfficial, RefRole } from "../../src/lib/types";

export type GameLineSource = "external" | "synthetic";

export interface GameLogEntry {
  gameId: string;
  date: string;
  season: string;
  league: "NBA" | "NHL";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  totalFouls: number;
  homeMinors?: number;
  awayMinors?: number;
  wentToOvertime?: boolean;
  closingTotal: number;
  homeSpread: number;
  lineSource: GameLineSource;
  officials: RefOfficial[];
}

export interface GameLogFile {
  lastUpdated: string;
  league: "NBA" | "NHL";
  source: string;
  games: GameLogEntry[];
}

export function gameLogPath(league: "NBA" | "NHL"): string {
  const root = path.join(process.cwd(), "data");
  return league === "NBA"
    ? path.join(root, "game-logs.json")
    : path.join(root, "nhl", "game-logs.json");
}

export function loadGameLogs(league: "NBA" | "NHL"): GameLogFile | null {
  const filePath = gameLogPath(league);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as GameLogFile;
  } catch {
    return null;
  }
}

export function saveGameLogs(file: GameLogFile): void {
  const filePath = gameLogPath(file.league);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(file, null, 2)}\n`);
}

export function dedupeGameLogs(games: GameLogEntry[]): GameLogEntry[] {
  const byId = new Map<string, GameLogEntry>();
  for (const game of games) {
    byId.set(game.gameId, game);
  }
  return [...byId.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
  );
}

export function officialKey(official: {
  name: string;
  number: number;
}): string {
  return `${official.name.toLowerCase()}|${official.number}`;
}

export function isRealLineGame(game: GameLogEntry): boolean {
  return (
    game.lineSource === "external" &&
    Number.isFinite(game.closingTotal) &&
    Number.isFinite(game.homeSpread)
  );
}

export function loadExternalLineMap(
  filePath: string,
): Map<string, { closingTotal: number; homeSpread: number }> {
  const map = new Map<string, { closingTotal: number; homeSpread: number }>();
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
      lines: { gameId: string; total: number; homeSpread?: number }[];
    };
    for (const line of raw.lines ?? []) {
      if (!line.gameId || line.total === undefined) continue;
      map.set(line.gameId, {
        closingTotal: line.total,
        homeSpread: line.homeSpread ?? 0,
      });
    }
  } catch {
    /* optional file */
  }
  return map;
}

export function toOfficials(
  crew: { name: string; number: number; role?: RefRole }[],
): RefOfficial[] {
  return crew.map((o) => ({
    name: o.name,
    number: o.number,
    role: o.role ?? "referee",
  }));
}

import * as fs from "node:fs";
import * as path from "node:path";
import type { RefOfficial, RefRole } from "../../src/lib/types";
import {
  buildMarketLineIndex,
  lookupMarketLine,
} from "../../src/lib/market-lines";

export type GameLineSource = "external" | "synthetic";

export interface GameLogEntry {
  gameId: string;
  date: string;
  season: string;
  league: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "WNBA";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  totalFouls: number;
  homeFouls?: number;
  awayFouls?: number;
  homeMinors?: number;
  awayMinors?: number;
  homeFlags?: number;
  awayFlags?: number;
  homePenaltyYards?: number;
  awayPenaltyYards?: number;
  wentToOvertime?: boolean;
  closingTotal: number;
  homeSpread: number;
  lineSource: GameLineSource;
  officials: RefOfficial[];
  whistlePeriodSplits?: import("../../src/lib/whistle-period-splits").WhistlePeriodSplits;
  penaltyEvents?: import("../../src/lib/types").NflPenaltyEvent[];
  scoringPlays?: import("../../src/lib/types").ScoringPlayEvent[];
  crewStoppages?: import("../../src/lib/types").CrewStoppageEvent[];
}

export interface GameLogFile {
  lastUpdated: string;
  league: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "WNBA";
  source: string;
  games: GameLogEntry[];
}

export function gameLogPath(league: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "WNBA"): string {
  const root = path.join(process.cwd(), "data");
  if (league === "NBA") return path.join(root, "game-logs.json");
  if (league === "NFL") return path.join(root, "nfl", "game-logs.json");
  if (league === "EPL") return path.join(root, "epl", "game-logs.json");
  if (league === "LALIGA") return path.join(root, "laliga", "game-logs.json");
  if (league === "WNBA") return path.join(root, "wnba", "game-logs.json");
  return path.join(root, "nhl", "game-logs.json");
}

export function loadGameLogs(league: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "WNBA"): GameLogFile | null {
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

/** Apply closing spread/total shards onto a league game-log file. */
export function applyMarketLineShards(
  file: GameLogFile,
  root = process.cwd(),
): { file: GameLogFile; applied: number } {
  if (file.league === "WNBA") {
    return { file, applied: 0 };
  }
  const index = buildMarketLineIndex(file.league, root);
  let applied = 0;

  const games = file.games.map((game) => {
    const line = lookupMarketLine(index, game);
    if (!line) return game;
    applied += 1;
    return {
      ...game,
      closingTotal: line.total,
      homeSpread: line.homeSpread,
      lineSource: "external" as const,
    };
  });

  return {
    file: {
      ...file,
      lastUpdated: new Date().toISOString(),
      games,
    },
    applied,
  };
}

export function mergeMarketLinesForLeague(
  league: GameLogFile["league"],
  root = process.cwd(),
): number {
  const existing = loadGameLogs(league);
  if (!existing) return 0;
  const { file, applied } = applyMarketLineShards(existing, root);
  saveGameLogs(file);
  return applied;
}

export function mergeMarketLinesForActiveLeagues(root = process.cwd()): void {
  const leagues: GameLogFile["league"][] = [
    "NBA",
    "NHL",
    "NFL",
    "EPL",
    "LALIGA",
  ];
  for (const league of leagues) {
    const applied = mergeMarketLinesForLeague(league, root);
    if (applied > 0) {
      console.log(`${league}: merged ${applied} external closing lines`);
    }
  }
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

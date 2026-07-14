import * as fs from "node:fs";
import * as path from "node:path";
import type { DataLeague } from "@/lib/game-logs-preload";
import type { GameOddsLine, OddsFile } from "@/lib/types";

export type VerifiedMarketLeague = "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA";

export type MarketLineShard = {
  gameId?: string;
  date?: string;
  homeTeam: string;
  awayTeam: string;
  total: number;
  homeSpread: number;
  source: string;
};

const SHARD_PATHS: Record<VerifiedMarketLeague, string[]> = {
  NBA: [
    path.join("data", "game-lines.json"),
    path.join("data", "odds.json"),
  ],
  NFL: [path.join("data", "nfl", "game-lines.json")],
  NHL: [
    path.join("data", "nhl", "odds.json"),
    path.join("data", "odds.json"),
  ],
  EPL: [path.join("data", "epl", "odds.json")],
  LALIGA: [path.join("data", "laliga", "odds.json")],
};

function readShardFile(filePath: string): MarketLineShard[] {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as OddsFile;
    return (raw.lines ?? [])
      .filter(
        (line): line is GameOddsLine & { homeSpread: number } =>
          Number.isFinite(line.total) && Number.isFinite(line.homeSpread),
      )
      .map((line) => ({
        gameId: line.gameId,
        date: "date" in line ? (line as { date?: string }).date : undefined,
        homeTeam: line.homeTeam.toUpperCase(),
        awayTeam: line.awayTeam.toUpperCase(),
        total: line.total,
        homeSpread: line.homeSpread!,
        source: line.source,
      }));
  } catch {
    return [];
  }
}

function matchupKey(
  date: string | undefined,
  homeTeam: string,
  awayTeam: string,
  includeDate = true,
): string {
  const home = homeTeam.toUpperCase();
  const away = awayTeam.toUpperCase();
  if (!includeDate || !date) return `${away}|${home}`;
  return `${date.slice(0, 10)}|${away}|${home}`;
}

export type MarketLineIndex = {
  byGameId: Map<string, MarketLineShard>;
  byMatchup: Map<string, MarketLineShard>;
  shardCount: number;
};

export function buildMarketLineIndex(
  league: VerifiedMarketLeague,
  root = process.cwd(),
): MarketLineIndex {
  const byGameId = new Map<string, MarketLineShard>();
  const byMatchup = new Map<string, MarketLineShard>();

  for (const relative of SHARD_PATHS[league]) {
    const filePath = path.join(root, relative);
    if (!fs.existsSync(filePath)) continue;

    for (const shard of readShardFile(filePath)) {
      if (shard.gameId) {
        byGameId.set(shard.gameId, shard);
      }
      byMatchup.set(
        matchupKey(shard.date, shard.homeTeam, shard.awayTeam, true),
        shard,
      );
      byMatchup.set(
        matchupKey(shard.date, shard.homeTeam, shard.awayTeam, false),
        shard,
      );
    }
  }

  return {
    byGameId,
    byMatchup,
    shardCount: byGameId.size + byMatchup.size,
  };
}

export function lookupMarketLine(
  index: MarketLineIndex,
  game: {
    gameId: string;
    date: string;
    homeTeam: string;
    awayTeam: string;
  },
): MarketLineShard | null {
  return (
    index.byGameId.get(game.gameId) ??
    index.byMatchup.get(
      matchupKey(game.date, game.homeTeam, game.awayTeam, true),
    ) ??
    index.byMatchup.get(
      matchupKey(game.date, game.homeTeam, game.awayTeam, false),
    ) ??
    null
  );
}

export function dataLeagueFromLeagueId(
  leagueId: string,
): VerifiedMarketLeague | null {
  const map: Record<string, VerifiedMarketLeague> = {
    nba: "NBA",
    nhl: "NHL",
    nfl: "NFL",
    epl: "EPL",
    laliga: "LALIGA",
  };
  return map[leagueId] ?? null;
}

export function verifiedMarketDataLeagues(): VerifiedMarketLeague[] {
  return ["NBA", "NHL", "NFL", "EPL", "LALIGA"];
}

export function gameLogPathForLeague(league: VerifiedMarketLeague): string {
  if (league === "NBA") return path.join("data", "game-logs.json");
  return path.join("data", league.toLowerCase(), "game-logs.json");
}

export type { DataLeague };

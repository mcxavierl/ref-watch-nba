import * as fs from "node:fs";
import * as path from "node:path";
import { toOfficials } from "../lib/game-logs";
import { GAME_LOGS_DIR } from "./config";
import { processNbaFoulShardEntry } from "./lib/ingest-utils";
import type { MergedGame } from "./merge-games";

const LEAGUE_AVG_TOTAL = 225;

export function toNdjsonGame(game: MergedGame) {
  const base = {
    gameId: game.gameId,
    date: game.date,
    season: game.season,
    league: "NBA" as const,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    totalPoints: game.totalPoints,
    totalFouls: game.totalFouls,
    closingTotal: LEAGUE_AVG_TOTAL,
    homeSpread: 0,
    lineSource: "synthetic" as const,
    officials: toOfficials(
      game.officials.map((o) => ({
        name: o.name,
        number: o.number,
        role: "referee" as const,
      })),
    ),
    officialsSource: game.officialsSource,
    isPlayoff: game.isPlayoff,
  };

  if (!game.fouls?.length) {
    return base;
  }

  return processNbaFoulShardEntry({
    ...base,
    fouls: game.fouls,
  });
}

export function writeSeasonShards(games: MergedGame[]): void {
  fs.mkdirSync(GAME_LOGS_DIR, { recursive: true });

  const bySeason = new Map<string, MergedGame[]>();
  for (const game of games) {
    const list = bySeason.get(game.season) ?? [];
    list.push(game);
    bySeason.set(game.season, list);
  }

  for (const [season, seasonGames] of bySeason) {
    const shardPath = path.join(GAME_LOGS_DIR, `${season}.ndjson`);
    const lines = seasonGames
      .filter((g) => !g.isPlayoff)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
      )
      .map((g) => JSON.stringify(toNdjsonGame(g)));
    fs.writeFileSync(shardPath, `${lines.join("\n")}\n`);
    console.log(`Wrote ${lines.length} games → ${shardPath}`);
  }
}

import { inferCfbSeason } from "./espn";
import type { CfbGameLogEntry } from "./transform";

export function resolveCurrentCfbSeason(asOf = new Date()): string {
  const iso = asOf.toISOString().slice(0, 10);
  return inferCfbSeason(iso);
}

export function countCurrentSeasonGames(
  gameLogs: Pick<CfbGameLogEntry, "season">[],
  currentSeason: string,
): number {
  return gameLogs.filter((game) => game.season === currentSeason).length;
}

export function meetsCfbGameLogThreshold(
  gameLogs: Pick<CfbGameLogEntry, "season">[],
  threshold: number,
  currentSeason = resolveCurrentCfbSeason(),
): { currentSeason: string; currentSeasonCount: number; meetsThreshold: boolean } {
  const currentSeasonCount = countCurrentSeasonGames(gameLogs, currentSeason);
  return {
    currentSeason,
    currentSeasonCount,
    meetsThreshold: currentSeasonCount >= threshold,
  };
}

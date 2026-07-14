import { fetchBbrHtml, readBbrCache } from "./fetch-bbr";
import type { MergedGame } from "./merge-games";
import {
  bbrBoxscoreCacheKey,
  bbrBoxscoreUrl,
  parseBoxscoreFouls,
} from "./parse-boxscore-fouls";

export function attachFoulsToGame(
  game: MergedGame,
  homeFouls: number,
  awayFouls: number,
): MergedGame {
  return {
    ...game,
    homeFouls,
    awayFouls,
    totalFouls: homeFouls + awayFouls,
  };
}

export async function enrichGameFoulsFromBbr(
  game: MergedGame,
  fetchMissing = false,
): Promise<MergedGame> {
  if (!game.bbrGameId) return game;

  const cacheKey = bbrBoxscoreCacheKey(game.bbrGameId);
  let html = readBbrCache(cacheKey);

  if (!html && fetchMissing) {
    html = await fetchBbrHtml(bbrBoxscoreUrl(game.bbrGameId), cacheKey);
  }

  if (!html) return game;

  const fouls = parseBoxscoreFouls(html, game.homeTeam, game.awayTeam);
  if (!fouls) return game;

  return attachFoulsToGame(game, fouls.homeFouls, fouls.awayFouls);
}

export async function enrichGamesFoulsFromBbr(
  games: MergedGame[],
  fetchMissing = false,
): Promise<MergedGame[]> {
  const enriched: MergedGame[] = [];
  let withFouls = 0;

  for (let i = 0; i < games.length; i++) {
    const game = games[i]!;
    const next = await enrichGameFoulsFromBbr(game, fetchMissing);
    if (next.totalFouls > 0) withFouls++;
    enriched.push(next);

    if ((i + 1) % 250 === 0) {
      console.log(`  fouls enriched: ${withFouls}/${i + 1}`);
    }
  }

  console.log(`  fouls enriched: ${withFouls}/${games.length}`);
  return enriched;
}

/** Per-team foul counts from a game log row (soccer, NFL flags, NHL minors). */
export function teamFoulsFromGameLog(
  game: {
    homeFlags?: number;
    awayFlags?: number;
    homeMinors?: number;
    awayMinors?: number;
    homeFouls?: number;
    awayFouls?: number;
    totalFouls: number;
  },
  isHome: boolean,
): { teamFouls: number; opponentFouls: number } {
  if (game.homeFouls !== undefined && game.awayFouls !== undefined) {
    return isHome
      ? { teamFouls: game.homeFouls, opponentFouls: game.awayFouls }
      : { teamFouls: game.awayFouls, opponentFouls: game.homeFouls };
  }
  if (game.homeFlags !== undefined && game.awayFlags !== undefined) {
    return isHome
      ? { teamFouls: game.homeFlags, opponentFouls: game.awayFlags }
      : { teamFouls: game.awayFlags, opponentFouls: game.homeFlags };
  }
  if (game.homeMinors !== undefined && game.awayMinors !== undefined) {
    return isHome
      ? { teamFouls: game.homeMinors, opponentFouls: game.awayMinors }
      : { teamFouls: game.awayMinors, opponentFouls: game.homeMinors };
  }
  const half = game.totalFouls / 2;
  return { teamFouls: half, opponentFouls: half };
}

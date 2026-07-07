/** Resolve whether `teamAbbr` won, including OT/SO when regulation scores tie. */
export function teamWonGame(
  homeScore: number,
  awayScore: number,
  homeTeam: string,
  awayTeam: string,
  teamAbbr: string,
  options?: { rng?: () => number; homeOtEdge?: number },
): boolean {
  const abbr = teamAbbr.toUpperCase();
  const isHome = homeTeam.toUpperCase() === abbr;
  const isAway = awayTeam.toUpperCase() === abbr;
  if (!isHome && !isAway) {
    throw new Error(`Team ${teamAbbr} not in ${homeTeam} vs ${awayTeam}`);
  }

  if (homeScore > awayScore) return isHome;
  if (homeScore < awayScore) return isAway;

  const homeOtEdge = options?.homeOtEdge ?? 0.52;
  const rng = options?.rng ?? Math.random;
  const homeWinsOt = rng() < homeOtEdge;
  return isHome ? homeWinsOt : !homeWinsOt;
}

/** Break a regulation tie with a single OT/SO goal so final scores have a winner. */
export function breakTieWithOvertime(
  homeScore: number,
  awayScore: number,
  rng: () => number,
  homeOtEdge = 0.52,
): { homeScore: number; awayScore: number; wentToOvertime: boolean } {
  if (homeScore !== awayScore) {
    return { homeScore, awayScore, wentToOvertime: false };
  }
  const homeWinsOt = rng() < homeOtEdge;
  return {
    homeScore: homeWinsOt ? homeScore + 1 : homeScore,
    awayScore: homeWinsOt ? awayScore : awayScore + 1,
    wentToOvertime: true,
  };
}

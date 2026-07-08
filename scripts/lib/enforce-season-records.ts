/** Adjust simulated box scores so each team hits official regular-season W-L. */

export interface EnforceableBox {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

export type SeasonWinTargets = Record<string, { wins: number; losses: number }>;

export function enforceSeasonWinTotals<T extends EnforceableBox>(
  boxes: T[],
  targets: SeasonWinTargets,
  rng: () => number = Math.random,
): T[] {
  const remaining = new Map<string, number>();
  for (const [team, record] of Object.entries(targets)) {
    remaining.set(team.toUpperCase(), record.wins);
  }

  const shuffled = [...boxes].sort(() => rng() - 0.5);

  for (const box of shuffled) {
    const home = box.homeTeam.toUpperCase();
    const away = box.awayTeam.toUpperCase();
    const homeNeed = remaining.get(home) ?? 0;
    const awayNeed = remaining.get(away) ?? 0;

    let homeMustWin: boolean;
    if (homeNeed > 0 && awayNeed > 0) {
      homeMustWin = homeNeed === awayNeed ? rng() > 0.5 : homeNeed > awayNeed;
    } else if (homeNeed > 0) {
      homeMustWin = true;
    } else if (awayNeed > 0) {
      homeMustWin = false;
    } else {
      homeMustWin = box.homeScore > box.awayScore;
    }

    applyWinner(box, homeMustWin);

    if (homeMustWin) {
      remaining.set(home, homeNeed - 1);
    } else {
      remaining.set(away, awayNeed - 1);
    }
  }

  return boxes;
}

function applyWinner(box: EnforceableBox, homeMustWin: boolean): void {
  if (homeMustWin) {
    if (box.homeScore <= box.awayScore) {
      box.homeScore = box.awayScore + 1;
    }
    return;
  }

  if (box.awayScore <= box.homeScore) {
    box.awayScore = box.homeScore + 1;
  }
}

function teamWinCount<T extends EnforceableBox>(
  boxes: T[],
  teamAbbr: string,
): number {
  const abbr = teamAbbr.toUpperCase();
  let wins = 0;
  for (const box of boxes) {
    if (box.homeTeam.toUpperCase() === abbr) {
      if (box.homeScore > box.awayScore) wins++;
    } else if (box.awayTeam.toUpperCase() === abbr) {
      if (box.awayScore > box.homeScore) wins++;
    }
  }
  return wins;
}

/** Flip one result so `teamAbbr` gains or loses a single win. */
function nudgeTeamWinTotal<T extends EnforceableBox>(
  boxes: T[],
  teamAbbr: string,
  delta: 1 | -1,
): void {
  const abbr = teamAbbr.toUpperCase();
  for (const box of boxes) {
    const isHome = box.homeTeam.toUpperCase() === abbr;
    const isAway = box.awayTeam.toUpperCase() === abbr;
    if (!isHome && !isAway) continue;

    const teamWinning = isHome
      ? box.homeScore > box.awayScore
      : box.awayScore > box.homeScore;

    if (delta === 1 && !teamWinning) {
      applyWinner(box, isHome);
      return;
    }
    if (delta === -1 && teamWinning) {
      applyWinner(box, !isHome);
      return;
    }
  }
}

export function rebalanceSeasonWinTotals<T extends EnforceableBox>(
  boxes: T[],
  targets: SeasonWinTargets,
): T[] {
  for (const [team, record] of Object.entries(targets)) {
    let guard = 10;
    while (guard-- > 0) {
      const wins = teamWinCount(boxes, team);
      if (wins === record.wins) break;
      nudgeTeamWinTotal(boxes, team, wins < record.wins ? 1 : -1);
    }
  }
  return boxes;
}

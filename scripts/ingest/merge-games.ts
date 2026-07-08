import type { BbrScheduleGame } from "./parse-schedule";
import type { NbaOfficial } from "./fetch-nba-stats";

export interface MergedGame {
  gameId: string;
  date: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  totalFouls: number;
  officials: NbaOfficial[];
  officialsSource: "nba-stats-api" | "bbr-boxscore";
  bbrGameId: string;
  isPlayoff: boolean;
}

export interface Discrepancy {
  type: "score" | "date" | "teams" | "winner" | "missing-nba" | "missing-bbr";
  gameKey: string;
  bbr?: Partial<BbrScheduleGame>;
  nba?: {
    gameId: string;
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
  };
  detail: string;
}

function gameMatchKey(
  date: string,
  home: string,
  away: string,
): string {
  return `${date}|${home}|${away}`;
}

export function matchBbrToNba(
  bbrGames: BbrScheduleGame[],
  nbaByKey: Map<
    string,
    {
      gameId: string;
      date: string;
      homeTeam: string;
      awayTeam: string;
      homeScore: number;
      awayScore: number;
    }
  >,
): { merged: MergedGame[]; discrepancies: Discrepancy[] } {
  const merged: MergedGame[] = [];
  const discrepancies: Discrepancy[] = [];
  const usedNba = new Set<string>();

  for (const bbr of bbrGames) {
    const key = gameMatchKey(bbr.date, bbr.homeTeam, bbr.awayTeam);
    const nba = nbaByKey.get(key);

    if (!nba) {
      discrepancies.push({
        type: "missing-nba",
        gameKey: key,
        bbr,
        detail: `BBR game not found in NBA Stats: ${key}`,
      });
      continue;
    }

    usedNba.add(nba.gameId);

    const fields: Discrepancy[] = [];
    if (bbr.homeScore !== nba.homeScore || bbr.awayScore !== nba.awayScore) {
      fields.push({
        type: "score",
        gameKey: key,
        bbr,
        nba,
        detail: `Score mismatch BBR ${bbr.awayScore}-${bbr.homeScore} vs NBA ${nba.awayScore}-${nba.homeScore}`,
      });
    }
    if (bbr.date !== nba.date) {
      fields.push({
        type: "date",
        gameKey: key,
        bbr,
        nba,
        detail: `Date mismatch BBR ${bbr.date} vs NBA ${nba.date}`,
      });
    }
    if (bbr.homeTeam !== nba.homeTeam || bbr.awayTeam !== nba.awayTeam) {
      fields.push({
        type: "teams",
        gameKey: key,
        bbr,
        nba,
        detail: `Team mismatch`,
      });
    }

    const bbrWinner =
      bbr.homeScore > bbr.awayScore
        ? bbr.homeTeam
        : bbr.awayScore > bbr.homeScore
          ? bbr.awayTeam
          : "tie";
    const nbaWinner =
      nba.homeScore > nba.awayScore
        ? nba.homeTeam
        : nba.awayScore > nba.homeScore
          ? nba.awayTeam
          : "tie";
    if (bbrWinner !== nbaWinner) {
      fields.push({
        type: "winner",
        gameKey: key,
        bbr,
        nba,
        detail: `Winner mismatch BBR ${bbrWinner} vs NBA ${nbaWinner}`,
      });
    }

    if (fields.length > 0) {
      discrepancies.push(...fields);
      continue;
    }

    merged.push({
      gameId: nba.gameId,
      date: nba.date,
      season: bbr.season,
      homeTeam: nba.homeTeam,
      awayTeam: nba.awayTeam,
      homeScore: nba.homeScore,
      awayScore: nba.awayScore,
      totalPoints: nba.homeScore + nba.awayScore,
      totalFouls: 0,
      officials: [],
      officialsSource: "nba-stats-api",
      bbrGameId: bbr.bbrGameId,
      isPlayoff: bbr.isPlayoff,
    });
  }

  for (const [key, nba] of nbaByKey) {
    if (!usedNba.has(nba.gameId)) {
      discrepancies.push({
        type: "missing-bbr",
        gameKey: key,
        nba,
        detail: `NBA Stats game not found in BBR schedule: ${nba.gameId}`,
      });
    }
  }

  return { merged, discrepancies };
}

export function attachOfficials(
  game: MergedGame,
  officials: NbaOfficial[],
  source: MergedGame["officialsSource"],
): MergedGame {
  return {
    ...game,
    officials,
    officialsSource: source,
  };
}

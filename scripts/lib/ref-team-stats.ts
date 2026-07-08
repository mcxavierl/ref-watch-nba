import type { RefTeamStat } from "./types";

export interface RefTeamGameRow {
  foulDifferential: number;
  totalPoints: number;
  overHit: boolean;
  teamWin: boolean;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function buildRefTeamStat(games: RefTeamGameRow[]): RefTeamStat {
  const n = games.length;
  const wins = games.filter((g) => g.teamWin).length;
  const losses = n - wins;
  return {
    games: n,
    wins,
    losses,
    avgFoulDifferential: round1(
      games.reduce((s, g) => s + g.foulDifferential, 0) / n,
    ),
    avgTotalPoints: round1(
      games.reduce((s, g) => s + g.totalPoints, 0) / n,
    ),
    overRate: round3(games.filter((g) => g.overHit).length / n),
    winRate: round3(wins / n),
  };
}

export function collectRefTeamStats(
  buckets: Map<string, RefTeamGameRow[]>,
): Record<string, RefTeamStat> {
  const teamStats: Record<string, RefTeamStat> = {};
  for (const [teamAbbr, games] of buckets) {
    if (games.length > 0) {
      teamStats[teamAbbr] = buildRefTeamStat(games);
    }
  }
  return teamStats;
}

export function pushRefTeamGame(
  refTeamBuckets: Map<string, Map<string, RefTeamGameRow[]>>,
  slug: string,
  teamAbbr: string,
  row: RefTeamGameRow,
): void {
  const byTeam = refTeamBuckets.get(slug) ?? new Map();
  const games = byTeam.get(teamAbbr) ?? [];
  games.push(row);
  byTeam.set(teamAbbr, games);
  refTeamBuckets.set(slug, byTeam);
}

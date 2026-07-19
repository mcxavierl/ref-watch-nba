import type { RefTeamStat } from "./types";

export interface RefTeamGameRow {
  gameId?: string;
  foulDifferential: number;
  totalPoints: number;
  overHit: boolean;
  teamWin: boolean;
  /** Regulation or final tie — excluded from straight-up W-L loss totals. */
  teamTie?: boolean;
  teamAtsResult?: "win" | "loss" | "push" | null;
}

function distinctRefTeamGames(games: RefTeamGameRow[]): RefTeamGameRow[] {
  const seen = new Set<string>();
  const distinct: RefTeamGameRow[] = [];
  for (const row of games) {
    const id = row.gameId;
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    distinct.push(row);
  }
  return distinct.length > 0 ? distinct : games;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function buildRefTeamStat(games: RefTeamGameRow[]): RefTeamStat {
  const rows = distinctRefTeamGames(games);
  const n = rows.length;
  const wins = rows.filter((g) => g.teamWin).length;
  const ties = rows.filter((g) => g.teamTie).length;
  const losses = rows.filter((g) => !g.teamWin && !g.teamTie).length;
  const atsGames = rows.filter((g) => g.teamAtsResult);
  const atsWins = atsGames.filter((g) => g.teamAtsResult === "win").length;
  const atsLosses = atsGames.filter((g) => g.teamAtsResult === "loss").length;
  const atsPushes = atsGames.filter((g) => g.teamAtsResult === "push").length;
  const atsDecisions = atsWins + atsLosses + atsPushes;
  return {
    games: n,
    wins,
    losses,
    ...(ties > 0 ? { ties } : {}),
    avgFoulDifferential: round1(
      rows.reduce((s, g) => s + g.foulDifferential, 0) / n,
    ),
    avgTotalPoints: round1(
      rows.reduce((s, g) => s + g.totalPoints, 0) / n,
    ),
    overRate: round3(rows.filter((g) => g.overHit).length / n),
    winRate: round3(wins / n),
    ...(atsDecisions > 0
      ? {
          atsWins,
          atsLosses,
          atsPushes,
          atsGames: atsDecisions,
          atsCoverRate: round3(atsWins / atsDecisions),
        }
      : {}),
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

import { getTeamSampleRecord, winRateDeltaPoints } from "@/lib/teamRecord";
import type { RefProfile, RefStatsFile, TeamCrewSplit } from "@/lib/types";

/** Minimum games before a ref×team cell is shown in the matrix. */
export const MATRIX_MIN_GAMES = 3;

export interface RefTeamMatrixCell {
  refSlug: string;
  teamAbbr: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface RefTeamMatrixTeam {
  abbr: string;
  label: string;
  name: string;
  nbaId?: number;
  baselineWinRate: number;
}

export interface RefTeamMatrixRef {
  slug: string;
  name: string;
  number?: number;
}

export interface RefTeamMatrix {
  refs: RefTeamMatrixRef[];
  teams: RefTeamMatrixTeam[];
  cells: Record<string, RefTeamMatrixCell>;
  minGames: number;
  qualifiedCellCount: number;
}

export function matrixCellKey(refSlug: string, teamAbbr: string): string {
  return `${refSlug}|${teamAbbr.toUpperCase()}`;
}

export function approxTeamRecord(
  games: number,
  winRate: number,
): { wins: number; losses: number } {
  const wins = Math.round(winRate * games);
  return { wins, losses: Math.max(0, games - wins) };
}

export function computeRefTeamMatrix(
  stats: RefStatsFile,
  teamList: { abbr: string; label: string; name: string; nbaId?: number }[],
  getTeamSplits: (abbr: string) => TeamCrewSplit[],
  minGames = MATRIX_MIN_GAMES,
): RefTeamMatrix {
  const teams: RefTeamMatrixTeam[] = teamList.map((team) => {
    const record = getTeamSampleRecord(getTeamSplits(team.abbr));
    return {
      abbr: team.abbr,
      label: team.label,
      name: team.name,
      nbaId: team.nbaId,
      baselineWinRate: record.winRate,
    };
  });

  const refs: RefTeamMatrixRef[] = stats.refs
    .filter((ref) => ref.teamStats && Object.keys(ref.teamStats).length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((ref) => ({
      slug: ref.slug,
      name: ref.name,
      number: ref.number,
    }));

  const cells: Record<string, RefTeamMatrixCell> = {};
  let qualifiedCellCount = 0;

  for (const ref of stats.refs) {
    if (!ref.teamStats) continue;
    for (const [teamAbbr, stat] of Object.entries(ref.teamStats)) {
      if (stat.games < minGames) continue;
      const { wins, losses } = approxTeamRecord(stat.games, stat.winRate);
      cells[matrixCellKey(ref.slug, teamAbbr)] = {
        refSlug: ref.slug,
        teamAbbr: teamAbbr.toUpperCase(),
        games: stat.games,
        wins,
        losses,
        winRate: stat.winRate,
      };
      qualifiedCellCount++;
    }
  }

  return { refs, teams, cells, minGames, qualifiedCellCount };
}

/** Refs with the most qualified matrix cells (for mobile condensed view). */
export function topMatrixRefs(
  matrix: RefTeamMatrix,
  limit = 12,
): RefTeamMatrixRef[] {
  const counts = new Map<string, number>();
  for (const cell of Object.values(matrix.cells)) {
    counts.set(cell.refSlug, (counts.get(cell.refSlug) ?? 0) + 1);
  }
  return [...matrix.refs]
    .filter((ref) => (counts.get(ref.slug) ?? 0) > 0)
    .sort((a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0))
    .slice(0, limit);
}

export function refHasTeamStat(
  ref: RefProfile,
  teamAbbr: string,
  minGames = MATRIX_MIN_GAMES,
): boolean {
  const stat = ref.teamStats?.[teamAbbr.toUpperCase()];
  return Boolean(stat && stat.games >= minGames);
}

export type MatrixCellExtreme = "high" | "low";

export const MATRIX_EXTREME_DELTA_PTS = 12;

export function matrixCellExtreme(
  cell: RefTeamMatrixCell,
  teamBaseline: number,
): MatrixCellExtreme | null {
  const delta = winRateDeltaPoints(cell.winRate, teamBaseline);
  if (delta >= MATRIX_EXTREME_DELTA_PTS) return "high";
  if (delta <= -MATRIX_EXTREME_DELTA_PTS) return "low";
  return null;
}

export interface MatrixExtremeHighlight {
  refSlug: string;
  refName: string;
  teamAbbr: string;
  teamLabel: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  baselineWinRate: number;
  deltaPts: number;
  kind: MatrixCellExtreme;
}

export function computeMatrixExtremes(
  matrix: RefTeamMatrix,
  limit = 6,
): MatrixExtremeHighlight[] {
  const highlights: MatrixExtremeHighlight[] = [];

  for (const ref of matrix.refs) {
    for (const team of matrix.teams) {
      const cell = matrix.cells[matrixCellKey(ref.slug, team.abbr)];
      if (!cell) continue;
      const extreme = matrixCellExtreme(cell, team.baselineWinRate);
      if (!extreme) continue;
      highlights.push({
        refSlug: ref.slug,
        refName: ref.name,
        teamAbbr: team.abbr,
        teamLabel: team.label,
        games: cell.games,
        wins: cell.wins,
        losses: cell.losses,
        winRate: cell.winRate,
        baselineWinRate: team.baselineWinRate,
        deltaPts: winRateDeltaPoints(cell.winRate, team.baselineWinRate),
        kind: extreme,
      });
    }
  }

  return highlights
    .sort((a, b) => Math.abs(b.deltaPts) - Math.abs(a.deltaPts))
    .slice(0, limit);
}

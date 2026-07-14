import type { LeagueMetricCopy } from "@/lib/leagues";
import { dataLeagueTenSeasons, DEFAULT_SINCE_SEASON } from "@/lib/league-seasons";
import { deltaTone } from "@/lib/metricTone";
import { getTeamDisplayRecord, getTeamSampleRecord, winRateDeltaPoints } from "@/lib/teamRecord";
import { getWorkerIsolateStore } from "@/lib/worker-isolate-store";
import { atsFieldsFromStat, getTeamAtsSampleRecord } from "@/lib/team-ats";
import { teamWhistleEdge } from "@/lib/stats-utils";
import type { RefProfile, RefStatsFile, RefTeamStat, TeamCrewSplit } from "@/lib/types";

/** Minimum games before a ref×team cell is shown in the matrix. */
/** Minimum ref×team games for a matrix cell (all live leagues). */
export const MATRIX_MIN_GAMES = 8;


function matrixComputeCache(): Map<string, unknown> {
  return getWorkerIsolateStore().matrixCompute;
}

export interface RefTeamMatrixCell {
  refSlug: string;
  teamAbbr: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  /** ATS cover splits when closing lines exist. */
  atsWins?: number;
  atsLosses?: number;
  atsPushes?: number;
  atsGames?: number;
  atsCoverRate?: number;
  /** Avg team-minus-opponent whistle volume per game (fouls, flags, minors, etc.). */
  avgFoulDifferential: number;
  /** True when 0 < games < minGames — shown muted, excluded from top/bottom panels. */
  thinSample?: boolean;
}

export type MatrixViewMode = "wl" | "ats";

export interface RefTeamMatrixTeam {
  abbr: string;
  label: string;
  name: string;
  nbaId?: number;
  /** Team sample W-L across all crews in this dataset (coloring reference only). */
  baselineWins: number;
  baselineLosses: number;
  baselineGames: number;
  baselineWinRate: number;
  /** Team ATS baseline across lined games in this sample. */
  baselineAtsWins?: number;
  baselineAtsLosses?: number;
  baselineAtsPushes?: number;
  baselineAtsGames?: number;
  baselineAtsCoverRate?: number;
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

/** Prefer hydrated crew splits; slim ref-stats core often omits or empties teamSplits. */
export function resolveMatrixTeamSplits(
  stats: RefStatsFile,
  teamAbbr: string,
  getTeamSplits: (abbr: string) => TeamCrewSplit[],
): TeamCrewSplit[] {
  const key = teamAbbr.toUpperCase();
  const embedded = stats.teamSplits[key];
  if (embedded && embedded.length > 0) return embedded;
  const resolved = getTeamSplits(teamAbbr);
  if (resolved.length > 0) return resolved;
  return embedded ?? [];
}

export function approxTeamRecord(
  games: number,
  winRate: number,
): { wins: number; losses: number } {
  const wins = Math.round(winRate * games);
  return { wins, losses: Math.max(0, games - wins) };
}

/** Prefer exact Basketball-Reference or game-log W-L when present. */
export function teamRecordFromStat(
  stat: RefTeamStat,
): { wins: number; losses: number } {
  if (stat.wins !== undefined && stat.losses !== undefined) {
    if (stat.games > 0 && stat.wins + stat.losses === 0) {
      return approxTeamRecord(stat.games, stat.winRate);
    }
    return { wins: stat.wins, losses: stat.losses };
  }
  return approxTeamRecord(stat.games, stat.winRate);
}

export interface RefTeamMatrixOptions {
  league?: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
  /** Earliest season label for NBA official baseline totals. */
  sinceSeason?: string;
  /** Hide refs with no qualified cells (useful for sparse ESPN-only leagues). */
  filterEmptyRows?: boolean;
}

export function computeRefTeamMatrix(
  stats: RefStatsFile,
  teamList: { abbr: string; label: string; name: string; nbaId?: number }[],
  getTeamSplits: (abbr: string) => TeamCrewSplit[],
  minGames = MATRIX_MIN_GAMES,
  matrixOptions: RefTeamMatrixOptions = {},
): RefTeamMatrix {
  const league = matrixOptions.league ?? "nba";
  const sinceSeason = matrixOptions.sinceSeason ?? DEFAULT_SINCE_SEASON;
  const cacheKey = [
    league,
    sinceSeason,
    minGames,
    matrixOptions.filterEmptyRows ? 1 : 0,
    stats.refs.length,
    teamList.length,
    stats.meta.lastUpdated,
    stats.refs.reduce((sum, ref) => sum + ref.games, 0),
  ].join("|");
  const cached = matrixComputeCache().get(cacheKey) as RefTeamMatrix | undefined;
  if (cached) return cached;

  const nbaRecordSeasons =
    league === "nba" && stats.meta.seasons.length === 0
      ? [...dataLeagueTenSeasons("NBA")]
      : stats.meta.seasons;

  const teams: RefTeamMatrixTeam[] = teamList.map((team) => {
    const abbr = team.abbr.toUpperCase();
    const splits = resolveMatrixTeamSplits(stats, team.abbr, getTeamSplits);
    const record =
      league === "nba"
        ? getTeamDisplayRecord(league, abbr, splits, nbaRecordSeasons, {
            sinceSeason,
          })
        : getTeamSampleRecord(splits);
    const atsRecord =
      stats.teamAtsBaselines?.[abbr] ?? getTeamAtsSampleRecord(splits);
    return {
      abbr: team.abbr,
      label: team.label,
      name: team.name,
      nbaId: team.nbaId,
      baselineWins: record.wins,
      baselineLosses: record.losses,
      baselineGames: record.games,
      baselineWinRate: record.winRate,
      baselineAtsWins: atsRecord.atsWins,
      baselineAtsLosses: atsRecord.atsLosses,
      baselineAtsPushes: atsRecord.atsPushes,
      baselineAtsGames: atsRecord.atsGames,
      baselineAtsCoverRate: atsRecord.atsCoverRate,
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
      if (stat.games < 1) continue;
      const { wins, losses } = teamRecordFromStat(stat);
      const ats = atsFieldsFromStat(stat);
      const thinSample = stat.games < minGames;
      cells[matrixCellKey(ref.slug, teamAbbr)] = {
        refSlug: ref.slug,
        teamAbbr: teamAbbr.toUpperCase(),
        games: stat.games,
        wins,
        losses,
        winRate: stat.winRate,
        atsWins: ats.atsWins,
        atsLosses: ats.atsLosses,
        atsPushes: ats.atsPushes,
        atsGames: ats.atsGames,
        atsCoverRate: ats.atsCoverRate,
        avgFoulDifferential: teamWhistleEdge(stat.avgFoulDifferential),
        thinSample,
      };
      if (!thinSample) qualifiedCellCount++;
    }
  }

  const visibleRefs = matrixOptions.filterEmptyRows
    ? refs.filter((ref) =>
        teams.some(
          (team) => cells[matrixCellKey(ref.slug, team.abbr)] !== undefined,
        ),
      )
    : refs;

  const result: RefTeamMatrix = {
    refs: visibleRefs,
    teams,
    cells,
    minGames,
    qualifiedCellCount,
  };
  matrixComputeCache().set(cacheKey, result);
  return result;
}

export function sortMatrixRefsByName(
  refs: RefTeamMatrixRef[],
): RefTeamMatrixRef[] {
  return [...refs].sort((a, b) => a.name.localeCompare(b.name));
}

/** Win-rate delta (percentage points) above/below team baseline for text tint. */
export const MATRIX_TONE_DELTA_PTS = 2;
/** Win-rate delta (percentage points) for standout split emphasis. */
export const MATRIX_EXTREME_DELTA_PTS = 12;

export type MatrixRefSort = "name-asc" | "standout-desc" | "total-delta-desc";

export const MATRIX_DEFAULT_REF_SORT: MatrixRefSort = "standout-desc";

export const MATRIX_STANDOUT_SORT_EXPLAINER = `Most standout ranks refs by qualified splits (≥${MATRIX_MIN_GAMES} games per cell) that diverge from that team's sample baseline by ±${MATRIX_EXTREME_DELTA_PTS} percentage points or more. Thicker samples break ties; thin-only rows sink to the bottom.`;

export const MATRIX_REF_SORT_OPTIONS: {
  value: MatrixRefSort;
  label: string;
}[] = [
  { value: "standout-desc", label: "Most standout (default)" },
  { value: "total-delta-desc", label: "Highest total delta" },
  { value: "name-asc", label: "Alphabetical" },
];

function matrixTeamBaseline(
  matrix: RefTeamMatrix,
  teamAbbr: string,
  viewMode: MatrixViewMode = "wl",
): number {
  const team = matrix.teams.find(
    (entry) => entry.abbr.toUpperCase() === teamAbbr.toUpperCase(),
  );
  if (!team) return 0;
  return viewMode === "ats"
    ? (team.baselineAtsCoverRate ?? 0)
    : team.baselineWinRate;
}

export function matrixTeamMetricGames(
  team: RefTeamMatrixTeam,
  viewMode: MatrixViewMode,
): number {
  return viewMode === "ats" ? (team.baselineAtsGames ?? 0) : team.baselineGames;
}

export function matrixTeamMetricRate(
  team: RefTeamMatrixTeam,
  viewMode: MatrixViewMode,
): number {
  return viewMode === "ats"
    ? (team.baselineAtsCoverRate ?? 0)
    : team.baselineWinRate;
}

export function matrixCellMetricRate(
  cell: RefTeamMatrixCell,
  viewMode: MatrixViewMode,
): number {
  return viewMode === "ats" ? (cell.atsCoverRate ?? 0) : cell.winRate;
}

export function matrixCellMetricGames(
  cell: RefTeamMatrixCell,
  viewMode: MatrixViewMode,
): number {
  return viewMode === "ats" ? (cell.atsGames ?? 0) : cell.games;
}

export function matrixCellMetricRecord(
  cell: RefTeamMatrixCell,
  viewMode: MatrixViewMode,
): string {
  if (viewMode === "ats") {
    const games = cell.atsGames ?? 0;
    if (games <= 0) return "n/a";
    const pushes = cell.atsPushes ?? 0;
    return pushes > 0
      ? `${cell.atsWins ?? 0}-${cell.atsLosses ?? 0}-${pushes}`
      : `${cell.atsWins ?? 0}-${cell.atsLosses ?? 0}`;
  }
  return `${cell.wins}-${cell.losses}`;
}

export function matrixTeamMetricRecord(
  team: RefTeamMatrixTeam,
  viewMode: MatrixViewMode,
): string {
  if (viewMode === "ats") {
    const games = team.baselineAtsGames ?? 0;
    if (games <= 0) return "n/a";
    const pushes = team.baselineAtsPushes ?? 0;
    return pushes > 0
      ? `${team.baselineAtsWins ?? 0}-${team.baselineAtsLosses ?? 0}-${pushes}`
      : `${team.baselineAtsWins ?? 0}-${team.baselineAtsLosses ?? 0}`;
  }
  if (team.baselineGames <= 0) return "n/a";
  return `${team.baselineWins}-${team.baselineLosses}`;
}

/** Total games in qualified (non-thin) ref×team cells for a ref row. */
export function refMatrixQualifiedGames(
  matrix: RefTeamMatrix,
  refSlug: string,
): number {
  let total = 0;
  for (const team of matrix.teams) {
    const cell = matrix.cells[matrixCellKey(refSlug, team.abbr)];
    if (!cell || cell.thinSample) continue;
    total += cell.games;
  }
  return total;
}

/** Count of qualified cells at or beyond ±MATRIX_EXTREME_DELTA_PTS vs team baseline. */
export function refMatrixStandoutCount(
  matrix: RefTeamMatrix,
  refSlug: string,
  viewMode: MatrixViewMode = "wl",
): number {
  let count = 0;
  for (const team of matrix.teams) {
    const cell = matrix.cells[matrixCellKey(refSlug, team.abbr)];
    if (!cell || cell.thinSample) continue;
    if (
      matrixCellExtremeFromDelta(
        winRateDeltaPoints(
          matrixCellMetricRate(cell, viewMode),
          matrixTeamBaseline(matrix, team.abbr, viewMode),
        ),
      )
    ) {
      count++;
    }
  }
  return count;
}

/** Sum of absolute win-rate deltas vs team baselines across qualified cells. */
export function refMatrixTotalDelta(
  matrix: RefTeamMatrix,
  refSlug: string,
  viewMode: MatrixViewMode = "wl",
): number {
  let total = 0;
  for (const team of matrix.teams) {
    const cell = matrix.cells[matrixCellKey(refSlug, team.abbr)];
    if (!cell || cell.thinSample) continue;
    total += Math.abs(
      winRateDeltaPoints(
        matrixCellMetricRate(cell, viewMode),
        matrixTeamBaseline(matrix, team.abbr, viewMode),
      ),
    );
  }
  return total;
}

export function sortMatrixRefs(
  refs: RefTeamMatrixRef[],
  matrix: RefTeamMatrix,
  sort: MatrixRefSort,
): RefTeamMatrixRef[] {
  return [...refs].sort((a, b) => {
    if (sort === "name-asc") {
      return a.name.localeCompare(b.name);
    }

    if (sort === "standout-desc") {
      const qualGamesA = refMatrixQualifiedGames(matrix, a.slug);
      const qualGamesB = refMatrixQualifiedGames(matrix, b.slug);
      const hasQualifiedA = qualGamesA > 0 ? 1 : 0;
      const hasQualifiedB = qualGamesB > 0 ? 1 : 0;
      if (hasQualifiedB !== hasQualifiedA) {
        return hasQualifiedB - hasQualifiedA;
      }

      const standoutDiff =
        refMatrixStandoutCount(matrix, b.slug) -
        refMatrixStandoutCount(matrix, a.slug);
      if (standoutDiff !== 0) return standoutDiff;

      const gamesDiff = qualGamesB - qualGamesA;
      if (gamesDiff !== 0) return gamesDiff;

      return a.name.localeCompare(b.name);
    }

    const qualGamesA = refMatrixQualifiedGames(matrix, a.slug);
    const qualGamesB = refMatrixQualifiedGames(matrix, b.slug);
    const hasQualifiedA = qualGamesA > 0 ? 1 : 0;
    const hasQualifiedB = qualGamesB > 0 ? 1 : 0;
    if (hasQualifiedB !== hasQualifiedA) {
      return hasQualifiedB - hasQualifiedA;
    }

    const diff =
      refMatrixTotalDelta(matrix, b.slug) -
      refMatrixTotalDelta(matrix, a.slug);
    if (diff !== 0) return diff;

    const gamesDiff = qualGamesB - qualGamesA;
    return gamesDiff !== 0 ? gamesDiff : a.name.localeCompare(b.name);
  });
}

export interface TeamTopRefEntry {
  refSlug: string;
  refName: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  atsWins?: number;
  atsLosses?: number;
  atsPushes?: number;
  atsGames?: number;
  atsCoverRate?: number;
  /** Win-rate delta vs team baseline (secondary stat in team panel). */
  deltaPts: number;
  /** Team-minus-opponent whistle volume per game; primary team-panel sort key. */
  avgFoulDifferential: number;
}

export const TEAM_MATRIX_REF_PANEL_LIMIT = 10;

export type MatrixTeamPanelSort = "record" | "penalty-diff";

export const MATRIX_DEFAULT_TEAM_PANEL_SORT: MatrixTeamPanelSort = "record";

/** Short column label for ref×team whistle differential in matrix panels. */
export function matrixWhistleDiffShortLabel(metrics: LeagueMetricCopy): string {
  return `${metrics.whistleShort} diff`;
}

function filterTeamPanelEntries(
  entries: TeamTopRefEntry[],
  sort: MatrixTeamPanelSort,
  direction: "top" | "bottom",
): TeamTopRefEntry[] {
  if (sort === "record") {
    return direction === "top"
      ? entries.filter((entry) => entry.deltaPts > 0)
      : entries.filter((entry) => entry.deltaPts < 0);
  }

  return direction === "top"
    ? entries.filter((entry) => entry.avgFoulDifferential > 0)
    : entries.filter((entry) => entry.avgFoulDifferential < 0);
}

function sortTeamPanelEntries(
  entries: TeamTopRefEntry[],
  sort: MatrixTeamPanelSort,
  direction: "top" | "bottom",
): TeamTopRefEntry[] {
  return [...entries].sort((a, b) => {
    if (sort === "penalty-diff") {
      const foulDiff =
        direction === "top"
          ? b.avgFoulDifferential - a.avgFoulDifferential
          : a.avgFoulDifferential - b.avgFoulDifferential;
      if (foulDiff !== 0) return foulDiff;
      return b.games - a.games;
    }

    const deltaDiff =
      direction === "top" ? b.deltaPts - a.deltaPts : a.deltaPts - b.deltaPts;
    if (deltaDiff !== 0) return deltaDiff;
    return b.games - a.games;
  });
}

function teamPanelEntriesForTeam(
  matrix: RefTeamMatrix,
  teamAbbr: string,
  viewMode: MatrixViewMode = "wl",
): TeamTopRefEntry[] {
  const team = matrix.teams.find(
    (entry) => entry.abbr.toUpperCase() === teamAbbr.toUpperCase(),
  );
  if (!team) return [];

  const entries: TeamTopRefEntry[] = [];

  for (const ref of matrix.refs) {
    const cell = matrix.cells[matrixCellKey(ref.slug, team.abbr)];
    if (!cell || cell.thinSample) continue;
    entries.push({
      refSlug: ref.slug,
      refName: ref.name,
      games: cell.games,
      wins: cell.wins,
      losses: cell.losses,
      winRate: cell.winRate,
      atsWins: cell.atsWins,
      atsLosses: cell.atsLosses,
      atsPushes: cell.atsPushes,
      atsGames: cell.atsGames,
      atsCoverRate: cell.atsCoverRate,
      deltaPts: winRateDeltaPoints(
        matrixCellMetricRate(cell, viewMode),
        matrixTeamMetricRate(team, viewMode),
      ),
      avgFoulDifferential: cell.avgFoulDifferential,
    });
  }

  return entries;
}

/** Qualified refs beating team baseline (record) or with best whistle diff, best first. */
export function topRefsBeatingBaselineForTeam(
  matrix: RefTeamMatrix,
  teamAbbr: string,
  limit = TEAM_MATRIX_REF_PANEL_LIMIT,
  sort: MatrixTeamPanelSort = MATRIX_DEFAULT_TEAM_PANEL_SORT,
  viewMode: MatrixViewMode = "wl",
): TeamTopRefEntry[] {
  const team = matrix.teams.find(
    (entry) => entry.abbr.toUpperCase() === teamAbbr.toUpperCase(),
  );
  if (!team || (sort === "record" && matrixTeamMetricGames(team, viewMode) <= 0)) {
    return [];
  }

  const entries = filterTeamPanelEntries(
    teamPanelEntriesForTeam(matrix, teamAbbr, viewMode),
    sort,
    "top",
  );
  return sortTeamPanelEntries(entries, sort, "top").slice(0, limit);
}

/** Qualified refs below team baseline (record) or with worst whistle diff, worst first. */
export function bottomRefsBelowBaselineForTeam(
  matrix: RefTeamMatrix,
  teamAbbr: string,
  limit = TEAM_MATRIX_REF_PANEL_LIMIT,
  sort: MatrixTeamPanelSort = MATRIX_DEFAULT_TEAM_PANEL_SORT,
  viewMode: MatrixViewMode = "wl",
): TeamTopRefEntry[] {
  const team = matrix.teams.find(
    (entry) => entry.abbr.toUpperCase() === teamAbbr.toUpperCase(),
  );
  if (!team || (sort === "record" && matrixTeamMetricGames(team, viewMode) <= 0)) {
    return [];
  }

  const entries = filterTeamPanelEntries(
    teamPanelEntriesForTeam(matrix, teamAbbr, viewMode),
    sort,
    "bottom",
  );
  return sortTeamPanelEntries(entries, sort, "bottom").slice(0, limit);
}

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

export type MatrixCellTone = "positive" | "negative" | "neutral";
export type MatrixCellExtreme = "high" | "low";

/** Background tint strength for above/below baseline cells (0–1, applied in CSS). */
export const MATRIX_TONE_BG_OPACITY = 0.15;

export interface MatrixCellStyle {
  tone: MatrixCellTone;
  extreme: MatrixCellExtreme | null;
  deltaPts: number;
}

export function matrixCellStyle(
  cell: RefTeamMatrixCell,
  teamBaseline: number,
  teamBaselineGames?: number,
  viewMode: MatrixViewMode = "wl",
): MatrixCellStyle {
  if (cell.thinSample) {
    return { tone: "neutral", extreme: null, deltaPts: 0 };
  }
  if (teamBaselineGames !== undefined && teamBaselineGames <= 0) {
    return { tone: "neutral", extreme: null, deltaPts: 0 };
  }
  const deltaPts = winRateDeltaPoints(
    matrixCellMetricRate(cell, viewMode),
    teamBaseline,
  );
  return {
    tone: deltaTone(deltaPts, MATRIX_TONE_DELTA_PTS),
    extreme: matrixCellExtremeFromDelta(deltaPts),
    deltaPts,
  };
}

export function matrixCellExtremeFromDelta(
  deltaPts: number,
): MatrixCellExtreme | null {
  if (deltaPts >= MATRIX_EXTREME_DELTA_PTS) return "high";
  if (deltaPts <= -MATRIX_EXTREME_DELTA_PTS) return "low";
  return null;
}

export function matrixCellExtreme(
  cell: RefTeamMatrixCell,
  teamBaseline: number,
): MatrixCellExtreme | null {
  return matrixCellExtremeFromDelta(
    winRateDeltaPoints(cell.winRate, teamBaseline),
  );
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
  baselineWins: number;
  baselineLosses: number;
  baselineGames: number;
  baselineWinRate: number;
  deltaPts: number;
  kind: MatrixCellExtreme;
}

export function formatMatrixTeamBaseline(
  team: RefTeamMatrixTeam,
  viewMode: MatrixViewMode = "wl",
): string {
  if (viewMode === "ats") {
    const games = team.baselineAtsGames ?? 0;
    if (games <= 0) return "unavailable";
    const record = matrixTeamMetricRecord(team, "ats");
    return `${record} ATS (${games} lined gp, ${((team.baselineAtsCoverRate ?? 0) * 100).toFixed(1)}%)`;
  }
  if (team.baselineGames <= 0) return "unavailable";
  return `${team.baselineWins}-${team.baselineLosses} (${team.baselineGames} gp, ${(team.baselineWinRate * 100).toFixed(1)}%)`;
}

export function formatMatrixHighlightBaseline(highlight: {
  baselineWins: number;
  baselineLosses: number;
  baselineGames: number;
  baselineWinRate: number;
}): string {
  if (highlight.baselineGames <= 0) return "unavailable";
  return `${highlight.baselineWins}-${highlight.baselineLosses} (${(highlight.baselineWinRate * 100).toFixed(1)}% across ${highlight.baselineGames} gp)`;
}

export function matrixCellAriaLabel(
  refName: string,
  team: RefTeamMatrixTeam,
  cell: RefTeamMatrixCell,
  deltaPts: number,
  viewMode: MatrixViewMode = "wl",
): string {
  const splitRecord = matrixCellMetricRecord(cell, viewMode);
  const baselineRecord = matrixTeamMetricRecord(team, viewMode);
  const metricLabel = viewMode === "ats" ? "ATS cover rate" : "win rate";
  const splitRate = matrixCellMetricRate(cell, viewMode);
  const baselineRate = matrixTeamMetricRate(team, viewMode);
  const baselineGames = matrixTeamMetricGames(team, viewMode);
  const deltaLabel =
    deltaPts === 0
      ? "at team baseline"
      : `${Math.abs(deltaPts).toFixed(1)} pts ${deltaPts > 0 ? "above" : "below"} team baseline`;
  const baselineLabel =
    baselineGames > 0
      ? `team sample baseline ${baselineRecord} in ${baselineGames} lined games (${(baselineRate * 100).toFixed(1)}% ${metricLabel})`
      : "team sample baseline unavailable";
  return `${refName} with ${team.label}: ref×team ${splitRecord} in ${cell.games} games (${(splitRate * 100).toFixed(1)}% ${metricLabel}), ${deltaLabel}; ${baselineLabel}`;
}

export function computeMatrixExtremes(
  matrix: RefTeamMatrix,
  limit = 6,
): MatrixExtremeHighlight[] {
  const highlights: MatrixExtremeHighlight[] = [];

  for (const ref of matrix.refs) {
    for (const team of matrix.teams) {
      const cell = matrix.cells[matrixCellKey(ref.slug, team.abbr)];
      if (!cell || cell.thinSample) continue;
      if (team.baselineGames <= 0) continue;
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
        baselineWins: team.baselineWins,
        baselineLosses: team.baselineLosses,
        baselineGames: team.baselineGames,
        baselineWinRate: team.baselineWinRate,
        deltaPts: winRateDeltaPoints(cell.winRate, team.baselineWinRate),
        kind: extreme,
      });
    }
  }

  return highlights
    .filter((highlight) => highlight.baselineGames > 0)
    .sort((a, b) => Math.abs(b.deltaPts) - Math.abs(a.deltaPts))
    .slice(0, limit);
}

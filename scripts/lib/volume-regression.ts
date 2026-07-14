/**
 * Shared volume-integrity checks for live leagues.
 * Used by check-deploy-readiness (pre-ship) and check-volume-regression (daily).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { VERIFIED_LIVE_LEAGUE_IDS } from "../../src/lib/league-verification";
import {
  bottomRefsBelowBaselineForTeam,
  MATRIX_MIN_GAMES,
  topRefsBeatingBaselineForTeam,
  TEAM_MATRIX_REF_PANEL_LIMIT,
} from "../../src/lib/ref-team-matrix";
import { computeRefTeamMatrix } from "../../src/lib/ref-team-matrix-compute";
import { getBaselinesFile } from "../../src/lib/baselines";
import { seasonRowsFromBaselines } from "../../src/lib/trends";
import type { RefStatsFile } from "../../src/lib/types";
import { getRefStats as getEplRefStats, getTeamSplits as getEplTeamSplits } from "../../src/lib/epl/data";
import { getRefStats as getLaligaRefStats, getTeamSplits as getLaligaTeamSplits } from "../../src/lib/laliga/data";
import { getRefStats as getNbaRefStats, getTeamSplits as getNbaTeamSplits } from "../../src/lib/data";
import { getRefStats as getNflRefStats, getTeamSplits as getNflTeamSplits } from "../../src/lib/nfl/data";
import { getRefStats as getNhlRefStats, getTeamSplits as getNhlTeamSplits } from "../../src/lib/nhl/data";
import { nhlAnalyticsRefStats } from "../../src/lib/nhl/officials";
import { EPL_TEAMS, teamFullName as eplTeamFullName } from "../../src/lib/epl/teams";
import { LALIGA_TEAMS, teamFullName as laligaTeamFullName } from "../../src/lib/laliga/teams";
import { NFL_TEAMS, teamFullName as nflTeamFullName } from "../../src/lib/nfl/teams";
import { NHL_TEAMS, teamFullName as nhlTeamFullName } from "../../src/lib/nhl/teams";
import { NBA_TEAMS, teamFullName as nbaTeamFullName } from "../../src/lib/teams";
import { findReverseNameGhosts } from "./ref-identity";

export type LiveLeague = (typeof VERIFIED_LIVE_LEAGUE_IDS)[number];

export const MIN_TOTAL_GAMES_FOR_CLAIMED_SEASONS: Record<
  LiveLeague,
  { minTotal: number; minPerSeason: number }
> = {
  nba: { minTotal: 10_000, minPerSeason: 900 },
  nhl: { minTotal: 10_000, minPerSeason: 700 },
  nfl: { minTotal: 2_500, minPerSeason: 220 },
  epl: { minTotal: 3_500, minPerSeason: 300 },
  laliga: { minTotal: 1_200, minPerSeason: 90 },
};

const SAMPLE_TEAMS: Record<LiveLeague, string> = {
  nba: "LAL",
  nhl: "WPG",
  nfl: "KC",
  epl: "ARS",
  laliga: "BAR",
};

const LIVE_DATA_LEAGUE_LABELS = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
} as const;

export interface LeagueVolumeSummary {
  league: LiveLeague;
  claimedSeasons: number;
  refStatsGames: number;
  logGames: number;
  uniqueLogIds: number;
  thinSeasons: string[];
  reverseNameGhosts: number;
  matrixBaselineGames: number;
  matrixTopPanel: number;
  matrixBottomPanel: number;
}

export interface VolumeRegressionReport {
  failures: string[];
  summaries: LeagueVolumeSummary[];
}

function readJson<T>(root: string, rel: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8")) as T;
  } catch {
    return null;
  }
}

function refStatsPath(league: LiveLeague): string {
  return league === "nba" ? "data/ref-stats.json" : `data/${league}/ref-stats.json`;
}

function gameLogPath(league: LiveLeague): string {
  return league === "nba" ? "data/game-logs.json" : `data/${league}/game-logs.json`;
}

function totalGamesProcessed(source: RefStatsFile): number {
  return (
    source.meta.totalGamesProcessed ??
    source.refs.reduce((sum, r) => sum + (r.games ?? 0), 0)
  );
}

export function checkSeasonGameCoverage(
  root: string,
  league: LiveLeague,
  source: RefStatsFile | null,
  failures: string[],
): { thinSeasons: string[]; logGames: number; uniqueLogIds: number } {
  const thinSeasons: string[] = [];
  if (!source?.meta) {
    return { thinSeasons, logGames: 0, uniqueLogIds: 0 };
  }

  const floors = MIN_TOTAL_GAMES_FOR_CLAIMED_SEASONS[league];
  const seasons = source.meta.seasons ?? [];
  const total = totalGamesProcessed(source);
  const seasonCount = seasons.length;

  if (seasonCount >= 8 && total < floors.minTotal) {
    failures.push(
      `${league}: only ${total} games across ${seasonCount} claimed seasons ` +
        `(need >= ${floors.minTotal}) — incomplete ingest; re-run build-${league}-data`,
    );
  }

  if (seasonCount > 0) {
    const perSeason = total / seasonCount;
    if (perSeason < floors.minPerSeason) {
      failures.push(
        `${league}: ~${Math.round(perSeason)} games/season across ${seasonCount} seasons ` +
          `(need >= ${floors.minPerSeason}/season) — season window is overstated vs game logs`,
      );
    }
  }

  const logs = readJson<{ games?: { season?: string; gameId?: string }[] }>(
    root,
    gameLogPath(league),
  );
  const logGames = logs?.games ?? [];
  const uniqueIds = new Set(logGames.map((g) => String(g.gameId ?? "")));

  if (logGames.length > 0) {
    if (uniqueIds.size < floors.minTotal && seasonCount >= 8) {
      failures.push(
        `${league}: game-logs.json has only ${uniqueIds.size} unique games ` +
          `(need >= ${floors.minTotal} for ${seasonCount}-season window)`,
      );
    }
    if (uniqueIds.size !== logGames.length) {
      failures.push(
        `${league}: game-logs.json has ${logGames.length - uniqueIds.size} duplicate gameIds — dedupe before deploy`,
      );
    }

    const bySeason = new Map<string, number>();
    for (const g of logGames) {
      if (!g.season) continue;
      bySeason.set(g.season, (bySeason.get(g.season) ?? 0) + 1);
    }
    for (const season of seasons) {
      const n = bySeason.get(season) ?? 0;
      if (n < floors.minPerSeason) {
        thinSeasons.push(season);
        failures.push(
          `${league}: claimed season ${season} has only ${n} games in logs ` +
            `(need >= ${floors.minPerSeason} for meaningful coverage) — omit from meta.seasons or finish ingest`,
        );
      }
    }
  }

  return {
    thinSeasons,
    logGames: logGames.length,
    uniqueLogIds: uniqueIds.size,
  };
}

export function checkReverseNameGhosts(
  league: LiveLeague,
  stats: RefStatsFile,
  failures: string[],
): number {
  const ghosts = findReverseNameGhosts(stats.refs);
  if (ghosts.length > 0) {
    failures.push(
      `${league} reverse-name ghosts: ${ghosts
        .map((g) => `${g.ghostName}→${g.canonName}`)
        .join(", ")}`,
    );
  }
  return ghosts.length;
}

export function checkMatrixBaselines(
  league: LiveLeague,
  failures: string[],
): {
  baselineGames: number;
  topPanel: number;
  bottomPanel: number;
} {
  const sample = SAMPLE_TEAMS[league];
  const cases = {
    nba: {
      stats: getNbaRefStats(),
      teams: NBA_TEAMS.map((t) => ({
        abbr: t.abbr,
        label: nbaTeamFullName(t),
        name: t.name,
        nbaId: t.nbaId,
      })),
      getTeamSplits: getNbaTeamSplits,
    },
    nhl: {
      stats: nhlAnalyticsRefStats(getNhlRefStats()),
      teams: NHL_TEAMS.map((t) => ({
        abbr: t.abbr,
        label: nhlTeamFullName(t),
        name: t.name,
      })),
      getTeamSplits: getNhlTeamSplits,
    },
    nfl: {
      stats: getNflRefStats(),
      teams: NFL_TEAMS.map((t) => ({
        abbr: t.abbr,
        label: nflTeamFullName(t),
        name: t.name,
      })),
      getTeamSplits: getNflTeamSplits,
    },
    epl: {
      stats: getEplRefStats(),
      teams: EPL_TEAMS.map((t) => ({
        abbr: t.abbr,
        label: eplTeamFullName(t),
        name: t.name,
      })),
      getTeamSplits: getEplTeamSplits,
    },
    laliga: {
      stats: getLaligaRefStats(),
      teams: LALIGA_TEAMS.map((t) => ({
        abbr: t.abbr,
        label: laligaTeamFullName(t),
        name: t.name,
      })),
      getTeamSplits: getLaligaTeamSplits,
    },
  } as const;

  const { stats, teams, getTeamSplits } = cases[league];
  const hydratedTeams = teams.filter(
    (team) => getTeamSplits(team.abbr).length > 0,
  ).length;
  if (hydratedTeams === 0) {
    failures.push(`${league}: team splits unavailable after hydration`);
  }

  const matrix = computeRefTeamMatrix(
    stats,
    teams,
    getTeamSplits,
    MATRIX_MIN_GAMES,
    { league },
  );
  const team = matrix.teams.find((t) => t.abbr.toUpperCase() === sample);
  if (!team) {
    failures.push(`${league}: matrix missing sample team ${sample}`);
    return { baselineGames: 0, topPanel: 0, bottomPanel: 0 };
  }
  if (team.baselineGames <= 0) {
    failures.push(
      `${league}: matrix baseline for ${sample} is ${team.baselineWins}-${team.baselineLosses} across ${team.baselineGames} gp`,
    );
  }

  const top = topRefsBeatingBaselineForTeam(
    matrix,
    sample,
    TEAM_MATRIX_REF_PANEL_LIMIT,
  );
  const bottom = bottomRefsBelowBaselineForTeam(
    matrix,
    sample,
    TEAM_MATRIX_REF_PANEL_LIMIT,
  );
  if (top.length === 0 || bottom.length === 0) {
    failures.push(
      `${league}: ${sample} matrix panels empty (top=${top.length}, bottom=${bottom.length})`,
    );
  }

  const topSlugs = new Set(top.map((e) => e.refSlug));
  const overlap = bottom.filter((e) => topSlugs.has(e.refSlug));
  if (overlap.length > 0) {
    failures.push(
      `${league}: ${sample} has ${overlap.length} ref(s) in both top and bottom panels (${overlap.map((e) => e.refSlug).join(", ")})`,
    );
  }

  if (matrix.minGames !== MATRIX_MIN_GAMES) {
    failures.push(
      `${league}: matrix minGames is ${matrix.minGames}, expected ${MATRIX_MIN_GAMES}`,
    );
  }

  return {
    baselineGames: team.baselineGames,
    topPanel: top.length,
    bottomPanel: bottom.length,
  };
}

export function checkTrendBaselines(root: string, failures: string[]): void {
  const baselinesPath = path.join(root, "data/baselines.json");
  if (!fs.existsSync(baselinesPath)) {
    failures.push("missing data/baselines.json");
    return;
  }

  const baselines = getBaselinesFile();
  for (const [league, dataLeague] of Object.entries(LIVE_DATA_LEAGUE_LABELS)) {
    const block = baselines[dataLeague];
    if (block.usingFallback || block.aggregate.gameCount === 0) {
      failures.push(
        `${league}: baselines still on fallback / empty — run npm run compute-baselines`,
      );
      continue;
    }
    const rows = seasonRowsFromBaselines(block.seasons);
    if (rows.length < 2) {
      failures.push(`${league}: trends need >= 2 season rows (have ${rows.length})`);
    }
  }
}

export function runVolumeRegressionChecks(root = process.cwd()): VolumeRegressionReport {
  const failures: string[] = [];
  const summaries: LeagueVolumeSummary[] = [];

  for (const league of VERIFIED_LIVE_LEAGUE_IDS) {
    const source = readJson<RefStatsFile>(root, refStatsPath(league));
    if (!source?.meta?.data_verified) {
      failures.push(`${league}: ${refStatsPath(league)} is not data_verified`);
      continue;
    }

    const coverage = checkSeasonGameCoverage(root, league, source, failures);
    const ghosts = checkReverseNameGhosts(league, source, failures);
    const matrix = checkMatrixBaselines(league, failures);

    summaries.push({
      league,
      claimedSeasons: source.meta.seasons?.length ?? 0,
      refStatsGames: totalGamesProcessed(source),
      logGames: coverage.logGames,
      uniqueLogIds: coverage.uniqueLogIds,
      thinSeasons: coverage.thinSeasons,
      reverseNameGhosts: ghosts,
      matrixBaselineGames: matrix.baselineGames,
      matrixTopPanel: matrix.topPanel,
      matrixBottomPanel: matrix.bottomPanel,
    });
  }

  checkTrendBaselines(root, failures);

  // NFL-specific merge sanity: Land Clark is the canonical regression canary.
  {
    const nfl = getNflRefStats();
    const land = nfl.refs.find((r) => r.slug === "land-clark-130");
    if (!land || land.games < 100) {
      failures.push(`NFL Land Clark missing or under-merged (games=${land?.games ?? 0})`);
    }
  }

  return { failures, summaries };
}

export function formatVolumeSummaryTable(summaries: LeagueVolumeSummary[]): string {
  const header =
    "league  seasons  ref-stats  log-games  thin-seasons  ghosts  matrix-gp  panels";
  const rows = summaries.map((s) => {
    const thin =
      s.thinSeasons.length > 0 ? s.thinSeasons.join(",") : "-";
    const panels = `${s.matrixTopPanel}/${s.matrixBottomPanel}`;
    return [
      s.league.padEnd(6),
      String(s.claimedSeasons).padStart(7),
      String(s.refStatsGames).padStart(9),
      String(s.uniqueLogIds || s.logGames).padStart(10),
      thin.padStart(12),
      String(s.reverseNameGhosts).padStart(7),
      String(s.matrixBaselineGames).padStart(10),
      panels.padStart(7),
    ].join(" ");
  });
  return [header, ...rows].join("\n");
}

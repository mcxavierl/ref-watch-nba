import * as fs from "node:fs";
import * as path from "node:path";
import { computeCrewMetrics as computeNbaCrewMetrics, refSlug as nbaRefSlug } from "@/lib/data";
import { computeCrewWhistlePremium as computeNbaPremium } from "@/lib/whistle-premium";
import { computeCrewMetrics as computeNflCrewMetrics } from "@/lib/nfl/data";
import { computeCrewWhistlePremium as computeNflPremium } from "@/lib/nfl/whistle-premium";
import { computeCrewMetrics as computeNhlCrewMetrics } from "@/lib/nhl/data";
import { computeCrewWhistlePremium as computeNhlPremium } from "@/lib/nhl/whistle-premium";
import { computeCrewMetrics as computeEplCrewMetrics } from "@/lib/epl/data";
import { computeCrewWhistlePremium as computeEplPremium } from "@/lib/epl/whistle-premium";
import { computeCrewMetrics as computeLaligaCrewMetrics } from "@/lib/laliga/data";
import { computeCrewWhistlePremium as computeLaligaPremium } from "@/lib/laliga/whistle-premium";
import { computeCrewMetrics as computeWnbaCrewMetrics } from "@/lib/wnba/data";
import { computeCrewMetrics as computeCbbCrewMetrics } from "@/lib/cbb/data";
import { computeCrewWhistlePremium as computeCbbPremium } from "@/lib/cbb/whistle-premium";
import { loadLeagueStats } from "@/lib/load-league-stats";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";
import {
  detectAnomaliesFromSlateMetrics,
  resolveSlateGames,
  type AnomalyMonitorResult,
  type SlateGameMetrics,
} from "@/lib/services/anomalyMonitor";
import type { AssignmentGame, AssignmentsFile, OddsFile, RefStatsFile } from "@/lib/types";

type LeagueMonitorAdapter = {
  buildMetrics: (
    game: AssignmentGame,
    stats: RefStatsFile,
    odds: OddsFile,
  ) => SlateGameMetrics | null;
};

function defaultMetricsBuilder(
  computeCrewMetrics: (crew: AssignmentGame["crew"], stats: RefStatsFile) => ReturnType<typeof computeNbaCrewMetrics>,
  computePremium: (
    game: AssignmentGame,
    stats: RefStatsFile,
    odds: OddsFile,
  ) => ReturnType<typeof computeNbaPremium>,
): LeagueMonitorAdapter["buildMetrics"] {
  return (game, stats, odds) => {
    if (game.crew.length === 0) return null;
    const metrics = computeCrewMetrics(game.crew, stats);
    const premium = computePremium(game, stats, odds);
    return {
      game,
      crewDelta: metrics.totalPointsDelta,
      lineLag: premium.gapVsBenchmark,
      crewAvgTotal: metrics.avgTotalPoints,
      benchmarkTotal: premium.benchmarkTotal,
      sampleGames: metrics.sampleGames,
      qualifiedRefCount: metrics.qualifiedRefs.length,
    };
  };
}

const MONITOR_ADAPTERS: Partial<Record<LeagueId, LeagueMonitorAdapter>> = {
  nba: {
    buildMetrics: defaultMetricsBuilder(computeNbaCrewMetrics, computeNbaPremium),
  },
  nfl: {
    buildMetrics: defaultMetricsBuilder(computeNflCrewMetrics, computeNflPremium),
  },
  nhl: {
    buildMetrics: defaultMetricsBuilder(computeNhlCrewMetrics, computeNhlPremium),
  },
  epl: {
    buildMetrics: defaultMetricsBuilder(computeEplCrewMetrics, computeEplPremium),
  },
  laliga: {
    buildMetrics: defaultMetricsBuilder(computeLaligaCrewMetrics, computeLaligaPremium),
  },
  wnba: {
    buildMetrics: (game, stats) => {
      if (game.crew.length === 0) return null;
      const metrics = computeWnbaCrewMetrics(game.crew, stats);
      return {
        game,
        crewDelta: metrics.totalPointsDelta,
        lineLag: metrics.avgTotalPoints - stats.meta.leagueAvgTotal,
        crewAvgTotal: metrics.avgTotalPoints,
        benchmarkTotal: stats.meta.leagueAvgTotal,
        sampleGames: metrics.sampleGames,
        qualifiedRefCount: metrics.qualifiedRefs.length,
      };
    },
  },
  cbb: {
    buildMetrics: defaultMetricsBuilder(computeCbbCrewMetrics, computeCbbPremium),
  },
};

function assignmentsPath(leagueId: LeagueId): string {
  const root = process.cwd();
  if (leagueId === "nba") return path.join(root, "data/assignments.json");
  return path.join(root, "data", leagueId, "assignments.json");
}

function oddsPath(leagueId: LeagueId): string | null {
  const root = process.cwd();
  if (leagueId === "nba") return path.join(root, "data/odds.json");
  const leagueOdds = path.join(root, "data", leagueId, "odds.json");
  return fs.existsSync(leagueOdds) ? leagueOdds : null;
}

export function loadAssignmentsForLeague(leagueId: LeagueId): AssignmentsFile | null {
  const filePath = assignmentsPath(leagueId);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as AssignmentsFile;
  } catch {
    return null;
  }
}

function loadAssignments(leagueId: LeagueId): AssignmentsFile | null {
  return loadAssignmentsForLeague(leagueId);
}

function loadOdds(leagueId: LeagueId): OddsFile {
  const file = oddsPath(leagueId);
  if (!file) {
    return { lastUpdated: "", source: "seeded", lines: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as OddsFile;
  } catch {
    return { lastUpdated: "", source: "seeded", lines: [] };
  }
}

export function runAnomalyMonitorForLeague(
  leagueId: LeagueId,
  assignments: AssignmentsFile,
): AnomalyMonitorResult | null {
  const adapter = MONITOR_ADAPTERS[leagueId];
  if (!adapter) return null;

  const stats = loadLeagueStats(leagueId).stats;
  const odds = loadOdds(leagueId);
  const games = resolveSlateGames(assignments);
  const metrics = games
    .map((game) => adapter.buildMetrics(game, stats, odds))
    .filter((row): row is SlateGameMetrics => row !== null);

  const events = detectAnomaliesFromSlateMetrics(leagueId, metrics);
  return {
    leagueId,
    generatedAt: new Date().toISOString(),
    assignmentsDate: assignments.date,
    gameCount: games.length,
    anomalyCount: events.length,
    events,
  };
}

export function runAnomalyMonitorForIngestedAssignments(
  leagueIds: LeagueId[] = activeLiveLeagueIds(),
): AnomalyMonitorResult[] {
  const results: AnomalyMonitorResult[] = [];
  for (const leagueId of leagueIds) {
    const assignments = loadAssignments(leagueId);
    if (!assignments) continue;
    const result = runAnomalyMonitorForLeague(leagueId, assignments);
    if (result) results.push(result);
  }
  return results;
}

export function writeAnomalyMonitorArtifact(
  results: AnomalyMonitorResult[],
  outputPath = path.join(process.cwd(), "data/anomaly-events.json"),
): void {
  const payload = {
    generatedAt: new Date().toISOString(),
    leagues: results.length,
    anomaliesDetected: results.reduce((sum, row) => sum + row.anomalyCount, 0),
    results,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
}

export { nbaRefSlug };

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
  detectAnomalies,
  type DetectedAnomaly,
} from "@/lib/analytics/anomalyEngine";
import {
  detectAnomaliesFromSlateMetrics,
  resolveSlateGames,
  type AnomalyDetectedEvent,
  type AnomalyMonitorResult,
  type SlateGameMetrics,
} from "@/lib/services/anomalyMonitor";
import type {
  AssignmentGame,
  AssignmentsFile,
  OddsFile,
  RefOfficial,
  RefProfile,
  RefStatsFile,
} from "@/lib/types";

type LeagueMonitorAdapter = {
  refSlug: (official: RefOfficial) => string;
  buildMetrics: (
    game: AssignmentGame,
    stats: RefStatsFile,
    odds: OddsFile,
  ) => SlateGameMetrics | null;
};

function resolveCrewProfiles(
  crew: RefOfficial[],
  stats: RefStatsFile,
  refSlug: (official: RefOfficial) => string,
): RefProfile[] {
  const profiles: RefProfile[] = [];
  for (const official of crew) {
    const slug = refSlug(official);
    const profile = stats.refs.find((row) => row.slug === slug);
    if (profile) profiles.push(profile);
  }
  return profiles;
}

function defaultMetricsBuilder(
  refSlug: (official: RefOfficial) => string,
  computeCrewMetrics: (crew: AssignmentGame["crew"], stats: RefStatsFile) => ReturnType<typeof computeNbaCrewMetrics>,
  computePremium: (
    game: AssignmentGame,
    stats: RefStatsFile,
    odds: OddsFile,
  ) => ReturnType<typeof computeNbaPremium>,
): LeagueMonitorAdapter {
  return {
    refSlug,
    buildMetrics: (game, stats, odds) => {
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
    },
  };
}

const MONITOR_ADAPTERS: Partial<Record<LeagueId, LeagueMonitorAdapter>> = {
  nba: {
    ...defaultMetricsBuilder(
      (official) => nbaRefSlug(official.name, official.number),
      computeNbaCrewMetrics,
      computeNbaPremium,
    ),
  },
  nfl: {
    ...defaultMetricsBuilder(
      (official) => `${official.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${official.number}`,
      computeNflCrewMetrics,
      computeNflPremium,
    ),
  },
  nhl: {
    ...defaultMetricsBuilder(
      (official) => `${official.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${official.number}`,
      computeNhlCrewMetrics,
      computeNhlPremium,
    ),
  },
  epl: {
    ...defaultMetricsBuilder(
      (official) => `${official.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${official.number}`,
      computeEplCrewMetrics,
      computeEplPremium,
    ),
  },
  laliga: {
    ...defaultMetricsBuilder(
      (official) => `${official.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${official.number}`,
      computeLaligaCrewMetrics,
      computeLaligaPremium,
    ),
  },
  wnba: {
    refSlug: (official) =>
      `${official.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${official.number}`,
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
    ...defaultMetricsBuilder(
      (official) => `${official.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${official.number}`,
      computeCbbCrewMetrics,
      computeCbbPremium,
    ),
  },
};

function toLegacyEvent(
  anomaly: DetectedAnomaly,
  timestamp: string,
): AnomalyDetectedEvent {
  return {
    event: "ANOMALY_DETECTED",
    timestamp,
    gameId: anomaly.gameId,
    severity: anomaly.severityLevel === "CRITICAL" ? "CRITICAL" : "HIGH",
    evidence: {
      leagueId: anomaly.leagueId,
      matchup: String(anomaly.evidence.matchup ?? ""),
      kinds: [anomaly.type === "LINE_MOVEMENT_DIVERGENCE" ? "line_lag" : "crew_disparity"],
      crewDelta: Number(anomaly.evidence.crewAverage ?? 0),
      crewDeltaZScore: anomaly.zScore,
      lineLag: Number(anomaly.evidence.lineLag ?? 0),
      crewAvgTotal: Number(anomaly.evidence.crewAverage ?? 0),
      benchmarkTotal: Number(anomaly.evidence.leagueAverage ?? 0),
      leagueMeanCrewDelta: 0,
      leagueStdDevCrewDelta: 0,
      sampleGames: Number(anomaly.evidence.sampleSize ?? 0),
      qualifiedRefCount: Number(anomaly.evidence.sampleSize ?? 0),
      crew: [],
      anomalyType: anomaly.type,
      severityScore: anomaly.severityScore,
      rollingWindowUsed: anomaly.rollingWindowUsed,
      summary: anomaly.summary,
    },
  };
}

export function runRollingAnomalyEngineForLeague(
  leagueId: LeagueId,
  assignments: AssignmentsFile,
): DetectedAnomaly[] {
  const adapter = MONITOR_ADAPTERS[leagueId];
  if (!adapter) return [];

  const stats = loadLeagueStats(leagueId).stats;
  const odds = loadOdds(leagueId);
  const games = resolveSlateGames(assignments);
  const detected: DetectedAnomaly[] = [];

  for (const game of games) {
    const metrics = adapter.buildMetrics(game, stats, odds);
    if (!metrics) continue;
    const crewProfiles = resolveCrewProfiles(game.crew, stats, adapter.refSlug);
    const anomalies = detectAnomalies({
      leagueId,
      game,
      crewProfiles,
      leagueAvgTotal: stats.meta.leagueAvgTotal,
      leagueAvgFouls: stats.meta.leagueAvgFouls,
      benchmarkTotal: metrics.benchmarkTotal,
      lineLag: metrics.lineLag,
      currentSeason: stats.meta.seasons.at(-1),
    });
    detected.push(...anomalies);
  }

  return detected;
}

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

  const timestamp = new Date().toISOString();
  const rolling = runRollingAnomalyEngineForLeague(leagueId, assignments);
  const legacyFromRolling = rolling.map((anomaly) => toLegacyEvent(anomaly, timestamp));
  const slateEvents = detectAnomaliesFromSlateMetrics(leagueId, metrics, timestamp);
  const events = legacyFromRolling.length > 0 ? legacyFromRolling : slateEvents;
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

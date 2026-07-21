import type { LeagueId } from "@/lib/leagues";
import type { AssignmentGame, AssignmentsFile, OddsFile, RefStatsFile } from "@/lib/types";

export type AnomalySeverity = "HIGH" | "CRITICAL";

export type AnomalyKind = "crew_disparity" | "line_lag";

export type AnomalyEvidence = {
  leagueId: LeagueId;
  matchup: string;
  kinds: AnomalyKind[];
  crewDelta: number;
  crewDeltaZScore: number | null;
  lineLag: number;
  crewAvgTotal: number;
  benchmarkTotal: number;
  leagueMeanCrewDelta: number;
  leagueStdDevCrewDelta: number;
  sampleGames: number;
  qualifiedRefCount: number;
  crew: Array<{
    name: string;
    number: number;
    slug: string;
  }>;
};

export type AnomalyDetectedEvent = {
  event: "ANOMALY_DETECTED";
  timestamp: string;
  gameId: string;
  severity: AnomalySeverity;
  evidence: AnomalyEvidence;
};

export type SlateGameMetrics = {
  game: AssignmentGame;
  crewDelta: number;
  lineLag: number;
  crewAvgTotal: number;
  benchmarkTotal: number;
  sampleGames: number;
  qualifiedRefCount: number;
};

export const CREW_DISPARITY_Z_THRESHOLD = 2.5;
export const LINE_LAG_POINTS_THRESHOLD = 4.5;
export const CRITICAL_Z_THRESHOLD = 3.5;
export const CRITICAL_LINE_LAG_THRESHOLD = 6;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function zScore(value: number, avg: number, sigma: number): number | null {
  if (sigma <= 0) return null;
  return round2((value - avg) / sigma);
}

export function classifyAnomalySeverity(input: {
  crewDeltaZScore: number | null;
  lineLag: number;
  crewDisparityFlag: boolean;
  lineLagFlag: boolean;
}): AnomalySeverity | null {
  const absZ = input.crewDeltaZScore === null ? 0 : Math.abs(input.crewDeltaZScore);
  const absLag = Math.abs(input.lineLag);

  if (
    (input.crewDisparityFlag && input.lineLagFlag) ||
    absZ >= CRITICAL_Z_THRESHOLD ||
    absLag >= CRITICAL_LINE_LAG_THRESHOLD
  ) {
    return "CRITICAL";
  }

  if (input.crewDisparityFlag || input.lineLagFlag) {
    return "HIGH";
  }

  return null;
}

export function detectAnomaliesFromSlateMetrics(
  leagueId: LeagueId,
  metrics: SlateGameMetrics[],
  timestamp = new Date().toISOString(),
): AnomalyDetectedEvent[] {
  const eligible = metrics.filter(
    (row) => row.qualifiedRefCount >= 2 && row.sampleGames >= 10,
  );
  if (eligible.length === 0) return [];

  const crewDeltas = eligible.map((row) => row.crewDelta);
  const leagueMean = mean(crewDeltas);
  const leagueSigma = stdDev(crewDeltas, leagueMean);

  const events: AnomalyDetectedEvent[] = [];

  for (const row of eligible) {
    const crewDeltaZScore = zScore(row.crewDelta, leagueMean, leagueSigma);
    const crewDisparityFlag =
      crewDeltaZScore !== null &&
      Math.abs(crewDeltaZScore) > CREW_DISPARITY_Z_THRESHOLD;
    const lineLagFlag = Math.abs(row.lineLag) > LINE_LAG_POINTS_THRESHOLD;
    const severity = classifyAnomalySeverity({
      crewDeltaZScore,
      lineLag: row.lineLag,
      crewDisparityFlag,
      lineLagFlag,
    });
    if (!severity) continue;

    const kinds: AnomalyKind[] = [];
    if (crewDisparityFlag) kinds.push("crew_disparity");
    if (lineLagFlag) kinds.push("line_lag");

    events.push({
      event: "ANOMALY_DETECTED",
      timestamp,
      gameId: row.game.id,
      severity,
      evidence: {
        leagueId,
        matchup: row.game.matchup,
        kinds,
        crewDelta: round2(row.crewDelta),
        crewDeltaZScore,
        lineLag: round2(row.lineLag),
        crewAvgTotal: round2(row.crewAvgTotal),
        benchmarkTotal: round2(row.benchmarkTotal),
        leagueMeanCrewDelta: round2(leagueMean),
        leagueStdDevCrewDelta: round2(leagueSigma),
        sampleGames: row.sampleGames,
        qualifiedRefCount: row.qualifiedRefCount,
        crew: row.game.crew.map((official) => ({
          name: official.name,
          number: official.number,
          slug: `${official.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")}-${official.number}`,
        })),
      },
    });
  }

  return events;
}

export function resolveSlateGames(assignments: AssignmentsFile): AssignmentGame[] {
  const games: AssignmentGame[] = [];
  const seen = new Set<string>();
  for (const game of assignments.games) {
    if (seen.has(game.id)) continue;
    seen.add(game.id);
    if (game.crew.length > 0) games.push(game);
  }
  for (const game of assignments.scheduledGames ?? []) {
    if (seen.has(game.id)) continue;
    seen.add(game.id);
    if (game.crew.length > 0) games.push(game);
  }
  return games;
}

export type AnomalyMonitorResult = {
  leagueId: LeagueId;
  generatedAt: string;
  assignmentsDate: string;
  gameCount: number;
  anomalyCount: number;
  events: AnomalyDetectedEvent[];
};

export function summarizeAnomalyMonitor(results: AnomalyMonitorResult[]): {
  generatedAt: string;
  leagues: number;
  gamesScanned: number;
  anomaliesDetected: number;
  results: AnomalyMonitorResult[];
} {
  return {
    generatedAt: new Date().toISOString(),
    leagues: results.length,
    gamesScanned: results.reduce((sum, row) => sum + row.gameCount, 0),
    anomaliesDetected: results.reduce((sum, row) => sum + row.anomalyCount, 0),
    results,
  };
}

export type AnomalyMonitorWorkerResult = {
  leagueId: LeagueId;
  monitor: AnomalyMonitorResult | null;
  events: AnomalyDetectedEvent[];
  webhook: {
    enqueued: number;
    dispatch: {
      processed: number;
      delivered: number;
      retried: number;
      dead: number;
    };
  };
};

/**
 * Background worker entry point: run after referee assignment ingestion for a league.
 * Scans the slate, emits ANOMALY_DETECTED events, and enqueues B2B webhook deliveries.
 */
export async function onAssignmentsIngested(
  leagueId: LeagueId,
  assignments: AssignmentsFile,
  options?: {
    dispatchWebhooks?: boolean;
    writeArtifact?: boolean;
    artifactPath?: string;
  },
): Promise<AnomalyMonitorWorkerResult> {
  const { runAnomalyMonitorForLeague, writeAnomalyMonitorArtifact } = await import(
    "@/lib/services/run-anomaly-monitor"
  );
  const { dispatchAnomalyWebhookEvents } = await import("@/lib/services/webhookDispatch");

  const monitor = runAnomalyMonitorForLeague(leagueId, assignments);
  const events = monitor?.events ?? [];

  if (options?.writeArtifact !== false && monitor) {
    writeAnomalyMonitorArtifact([monitor], options?.artifactPath);
  }

  const webhook = await dispatchAnomalyWebhookEvents(events, {
    processImmediately: options?.dispatchWebhooks ?? true,
    maxPasses: 4,
  });

  return {
    leagueId,
    monitor,
    events,
    webhook: {
      enqueued: webhook.enqueued,
      dispatch: {
        processed: webhook.dispatch.processed,
        delivered: webhook.dispatch.delivered,
        retried: webhook.dispatch.retried,
        dead: webhook.dispatch.dead,
      },
    },
  };
}

/**
 * Scan all live leagues after a batch assignment ingest (nightly/morning slate).
 */
export async function onBatchAssignmentsIngested(
  leagueIds: LeagueId[],
  options?: {
    dispatchWebhooks?: boolean;
    writeArtifact?: boolean;
    artifactPath?: string;
  },
): Promise<{
  summary: ReturnType<typeof summarizeAnomalyMonitor>;
  webhook: {
    enqueued: number;
    dispatch: {
      processed: number;
      delivered: number;
      retried: number;
      dead: number;
    };
  };
}> {
  const results: AnomalyMonitorResult[] = [];
  let enqueued = 0;
  const dispatch = { processed: 0, delivered: 0, retried: 0, dead: 0 };

  for (const leagueId of leagueIds) {
    const { loadAssignmentsForLeague } = await import("@/lib/services/run-anomaly-monitor");
    const assignments = loadAssignmentsForLeague(leagueId);
    if (!assignments) continue;

    const worker = await onAssignmentsIngested(leagueId, assignments, {
      ...options,
      writeArtifact: false,
    });
    if (worker.monitor) results.push(worker.monitor);
    enqueued += worker.webhook.enqueued;
    dispatch.processed += worker.webhook.dispatch.processed;
    dispatch.delivered += worker.webhook.dispatch.delivered;
    dispatch.retried += worker.webhook.dispatch.retried;
    dispatch.dead += worker.webhook.dispatch.dead;
  }

  if (options?.writeArtifact !== false) {
    const { writeAnomalyMonitorArtifact } = await import("@/lib/services/run-anomaly-monitor");
    writeAnomalyMonitorArtifact(results, options?.artifactPath);
  }

  return {
    summary: summarizeAnomalyMonitor(results),
    webhook: { enqueued, dispatch },
  };
}

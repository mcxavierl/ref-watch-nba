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

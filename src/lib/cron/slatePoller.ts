import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { isWithinAssignmentWindow } from "@/lib/cron/assignment-window";
import {
  buildSlateProjectionCache,
  countSlateGames,
  SLATE_PROJECTION_CACHE_PATH,
  writeSlateProjectionCache,
} from "@/lib/cron/slate-projection-cache";
import type {
  SlateIngestionStatus,
  SlatePollIngestStep,
  SlatePollOptions,
  SlatePollResult,
} from "@/lib/cron/slate-poller-types";
import { getRefStats } from "@/lib/data";
import {
  createSlateIngestionLogRecord,
  getSlateIngestionLogStore,
} from "@/lib/services/slateIngestionLogStore";
import { runIntegrityMonitorPipeline } from "@/lib/services/integrityMonitor";
import { alertsSummary, computeSlateAlerts } from "@/lib/slate-alerts";
import type { AssignmentsFile } from "@/lib/types";

export const DEFAULT_SLATE_POLL_STEPS: SlatePollIngestStep[] = [
  { label: "NBA assignments", command: "npm run fetch-assignments", leagueId: "nba" },
  {
    label: "WNBA assignments",
    command: "npm run fetch-wnba-assignments",
    leagueId: "wnba",
    optional: true,
  },
  { label: "NHL assignments", command: "npm run fetch-nhl-assignments", leagueId: "nhl" },
  { label: "NFL assignments", command: "npm run fetch-nfl-assignments", leagueId: "nfl" },
  { label: "EPL assignments", command: "npm run fetch-epl-assignments", leagueId: "epl" },
  {
    label: "La Liga assignments",
    command: "npm run fetch-laliga-assignments",
    leagueId: "laliga",
    optional: true,
  },
  { label: "NBA odds", command: "npm run fetch-odds", optional: true },
  { label: "NHL odds", command: "npm run fetch-nhl-odds", optional: true },
  { label: "NFL odds", command: "npm run fetch-nfl-odds", optional: true },
];

function runStep(step: SlatePollIngestStep): void {
  execSync(step.command, { stdio: "inherit" });
}

async function rebuildOverviewArtifacts(): Promise<void> {
  execSync("npx tsx scripts/build-overview-snapshot.ts", { stdio: "inherit" });
  execSync("npx tsx scripts/build-overview-insights.ts", { stdio: "inherit" });
}

function writeMorningAlerts(): void {
  const assignmentsPath = path.join(process.cwd(), "data", "assignments.json");
  const alertsPath = path.join(process.cwd(), "data", "alerts.json");
  const assignments = JSON.parse(fs.readFileSync(assignmentsPath, "utf8")) as AssignmentsFile;
  const stats = getRefStats();
  const alerts = computeSlateAlerts(assignments, stats);
  fs.mkdirSync(path.dirname(alertsPath), { recursive: true });
  fs.writeFileSync(alertsPath, JSON.stringify(alerts, null, 2));
  console.log(alertsSummary(alerts).join("\n"));
}

function resolveStatus(
  stepsCompleted: string[],
  stepsFailed: string[],
): SlateIngestionStatus {
  if (stepsCompleted.length === 0 && stepsFailed.length > 0) return "error";
  if (stepsFailed.length > 0) return "partial";
  return "success";
}

export async function runSlatePoll(options: SlatePollOptions = {}): Promise<SlatePollResult> {
  const startedAt = options.now ?? new Date();
  const withinWindow = isWithinAssignmentWindow(startedAt);

  if (!withinWindow && !options.force) {
    const finishedAt = new Date();
    const log = createSlateIngestionLogRecord({
      gamesUpdated: 0,
      crewsAssignedCount: 0,
      latencyMs: finishedAt.getTime() - startedAt.getTime(),
      status: "skipped",
      projectionsWritten: 0,
      stepsCompleted: [],
      stepsFailed: [],
    });
    await (await getSlateIngestionLogStore()).append(log);
    return {
      status: "skipped",
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      latencyMs: log.latencyMs,
      withinWindow,
      gamesUpdated: 0,
      crewsAssignedCount: 0,
      projectionsWritten: 0,
      stepsCompleted: [],
      stepsFailed: [],
      cachePath: SLATE_PROJECTION_CACHE_PATH,
      logId: log.id,
    };
  }

  const steps = options.steps ?? DEFAULT_SLATE_POLL_STEPS;
  const stepsCompleted: string[] = [];
  const stepsFailed: string[] = [];

  for (const step of steps) {
    console.log(`\n--- ${step.label} ---`);
    try {
      runStep(step);
      stepsCompleted.push(step.label);
    } catch (error) {
      if (step.optional) {
        console.warn(`${step.label} failed - continuing.`);
        stepsFailed.push(step.label);
        continue;
      }
      stepsFailed.push(step.label);
      throw error;
    }
  }

  const projectionCache = buildSlateProjectionCache();
  writeSlateProjectionCache(projectionCache);

  if (options.writeAlerts) {
    console.log("\n--- NBA slate alerts ---");
    writeMorningAlerts();
    stepsCompleted.push("NBA alerts");
  }

  if (options.rebuildOverview ?? true) {
    console.log("\n--- Overview snapshot ---");
    await rebuildOverviewArtifacts();
    stepsCompleted.push("Overview snapshot");
  }

  if (options.runIntegrity) {
    console.log("\n--- Integrity monitor ---");
    const integrity = await runIntegrityMonitorPipeline({ processWebhooks: true });
    console.log(
      `Integrity monitor: ${integrity.monitor.anomaliesDetected} anomalies across ${integrity.monitor.gamesScanned} games.`,
    );
    stepsCompleted.push("Integrity monitor");
  }

  const counts = countSlateGames();
  const finishedAt = new Date();
  const status = resolveStatus(stepsCompleted, stepsFailed);
  const log = createSlateIngestionLogRecord({
    gamesUpdated: counts.gamesUpdated,
    crewsAssignedCount: counts.crewsAssignedCount,
    latencyMs: finishedAt.getTime() - startedAt.getTime(),
    status,
    projectionsWritten: Object.keys(projectionCache.games).length,
    stepsCompleted,
    stepsFailed,
  });
  await (await getSlateIngestionLogStore()).append(log);

  return {
    status,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    latencyMs: log.latencyMs,
    withinWindow,
    gamesUpdated: counts.gamesUpdated,
    crewsAssignedCount: counts.crewsAssignedCount,
    projectionsWritten: log.projectionsWritten,
    stepsCompleted,
    stepsFailed,
    cachePath: SLATE_PROJECTION_CACHE_PATH,
    logId: log.id,
  };
}

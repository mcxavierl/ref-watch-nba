import * as fs from "node:fs";
import * as path from "node:path";
import { isLeagueInSeasonWindow } from "@/lib/active-leagues-by-season";
import { alertIfActiveSlateEmpty, dispatchScraperAlert } from "@/lib/cron/scraper-alert";
import { getLiveSlateGames } from "@/lib/live-slate-engine";
import type { LeagueId } from "@/lib/leagues";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import { runIntegrityMonitorPipeline } from "@/lib/services/integrityMonitor";
import { mergeSlateLiveCrews } from "@/lib/slate-live-crews";
import {
  enrichSlateLiveCrews,
  fetchSlateLiveCrews,
} from "@/lib/slate-live-crews-server";
import { fetchSlateLiveScores, mergeSlateLiveScores } from "@/lib/slate-live-scores";
import type { AssignmentsFile } from "@/lib/types";

export type LeagueSyncResult = {
  leagueId: LeagueId;
  assignmentGames: number;
  liveGames: number;
  isLiveSeason: boolean;
  assignmentSyncAttempted: boolean;
  assignmentSyncOk: boolean;
  error?: string;
};

export type SyncSlatePipelineResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  slateGames: number;
  liveGames: number;
  scoresRefreshed: number;
  leagues: LeagueSyncResult[];
  integrity: Awaited<ReturnType<typeof runIntegrityMonitorPipeline>> | null;
  alertsDispatched: number;
};

const ASSIGNMENT_SYNC_COMMANDS: Partial<Record<LeagueId, string>> = {
  nba: "npm run fetch-assignments",
  wnba: "npm run fetch-wnba-assignments",
  nhl: "npm run fetch-nhl-assignments",
  nfl: "npm run fetch-nfl-assignments",
  epl: "npm run fetch-epl-assignments",
  laliga: "npm run fetch-laliga-assignments",
};

function assignmentsPath(leagueId: LeagueId): string {
  const root = process.cwd();
  if (leagueId === "nba") return path.join(root, "data/assignments.json");
  return path.join(root, "data", leagueId, "assignments.json");
}

export function canRunFilesystemAssignmentSync(): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "data"));
  } catch {
    return false;
  }
}

function countAssignmentGames(leagueId: LeagueId): number {
  const filePath = assignmentsPath(leagueId);
  if (!fs.existsSync(filePath)) return 0;
  try {
    const file = JSON.parse(fs.readFileSync(filePath, "utf8")) as AssignmentsFile;
    return file.games?.length ?? 0;
  } catch {
    return 0;
  }
}

async function runAssignmentSyncCommand(
  leagueId: LeagueId,
): Promise<{ ok: boolean; error?: string }> {
  const command = ASSIGNMENT_SYNC_COMMANDS[leagueId];
  if (!command) return { ok: true };

  try {
    const { execSync } = await import("node:child_process");
    execSync(command, { stdio: "pipe" });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await dispatchScraperAlert({
      operation: "assignment_sync",
      leagueId,
      message: `Assignment sync failed for ${leagueId}`,
      error: message,
    });
    return { ok: false, error: message };
  }
}

/**
 * Refresh live slate scores/crews, optionally scrape assignments on Node hosts,
 * and run the integrity monitor pipeline.
 */
export async function runSyncSlatePipeline(options?: {
  now?: Date;
  syncAssignments?: boolean;
}): Promise<SyncSlatePipelineResult> {
  const startedAt = new Date().toISOString();
  const now = options?.now ?? new Date();
  let alertsDispatched = 0;

  const slate = getLiveSlateGames({ now, allGames: true });
  const [scores, crews] = await Promise.all([
    fetchSlateLiveScores(slate.games),
    fetchSlateLiveCrews(slate.games),
  ]);
  const mergedGames = mergeSlateLiveCrews(
    mergeSlateLiveScores(slate.games, scores),
    enrichSlateLiveCrews(slate.games, crews),
  );
  const liveGames = mergedGames.filter(
    (game) => game.status === "live" || game.gamePhase === "live",
  ).length;

  const shouldSyncAssignments =
    (options?.syncAssignments ?? true) && canRunFilesystemAssignmentSync();

  const leagues: LeagueSyncResult[] = [];

  for (const leagueId of activeLiveLeagueIds()) {
    const isLiveSeason = isLeagueInSeasonWindow(leagueId, now);
    let assignmentGames = 0;
    let assignmentSyncAttempted = false;
    let assignmentSyncOk = true;
    let error: string | undefined;

    try {
      if (shouldSyncAssignments && ASSIGNMENT_SYNC_COMMANDS[leagueId]) {
        assignmentSyncAttempted = true;
        const sync = await runAssignmentSyncCommand(leagueId);
        assignmentSyncOk = sync.ok;
        error = sync.error;
        if (!sync.ok) alertsDispatched += 1;
      }

      assignmentGames = canRunFilesystemAssignmentSync()
        ? countAssignmentGames(leagueId)
        : slate.games.filter((game) => game.leagueId === leagueId).length;

      await alertIfActiveSlateEmpty({
        leagueId,
        isLiveSeason,
        gameCount: assignmentGames,
        operation: "sync_slate",
      });
      if (assignmentGames === 0 && isLiveSeason) {
        alertsDispatched += 1;
      }
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
      const alert = await dispatchScraperAlert({
        operation: "sync_slate",
        leagueId,
        message: `Slate sync failed for ${leagueId}`,
        error,
      });
      if (alert.dispatched) alertsDispatched += 1;
      assignmentSyncOk = false;
    }

    leagues.push({
      leagueId,
      assignmentGames,
      liveGames: slate.games.filter((game) => game.leagueId === leagueId && game.status === "live")
        .length,
      isLiveSeason,
      assignmentSyncAttempted,
      assignmentSyncOk,
      error,
    });
  }

  let integrity: Awaited<ReturnType<typeof runIntegrityMonitorPipeline>> | null = null;
  try {
    integrity = await runIntegrityMonitorPipeline({ processWebhooks: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const alert = await dispatchScraperAlert({
      operation: "integrity_monitor",
      message: "Integrity monitor failed during sync-slate",
      error: message,
    });
    if (alert.dispatched) alertsDispatched += 1;
  }

  return {
    ok: leagues.every((league) => league.assignmentSyncOk),
    startedAt,
    finishedAt: new Date().toISOString(),
    slateGames: mergedGames.length,
    liveGames,
    scoresRefreshed: mergedGames.length,
    leagues,
    integrity,
    alertsDispatched,
  };
}

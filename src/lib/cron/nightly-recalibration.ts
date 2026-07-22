import {
  applyRecalibratedMetricsToProfile,
  recalibrateOfficialMetrics,
} from "@/lib/cron/rolling-ref-metrics";
import {
  loadLeagueRefStats,
  loadRollingMetricsCache,
  rollingMetricsCacheKey,
  writeLeagueRefStats,
  writeRollingMetricsCache,
} from "@/lib/cron/ref-stats-artifact";
import { invalidateRefProfileCaches } from "@/lib/cron/invalidate-ref-profile-cache";
import { CURRENT_SEASON_LABEL } from "@/lib/league-seasons";
import type { LeagueId } from "@/lib/leagues";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import { dispatchScraperAlert } from "@/lib/cron/scraper-alert";
import { canRunFilesystemAssignmentSync } from "@/lib/cron/sync-slate-pipeline";

export type NightlyRecalibrationResult = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  leaguesProcessed: number;
  officialsUpdated: number;
  errors: string[];
};

/**
 * Nightly batch recalibration of rolling ref metrics across all live leagues.
 * Mirrors the post-game autopsy pipeline without requiring a completed autopsy row.
 */
export async function runNightlyProfileRecalibration(): Promise<NightlyRecalibrationResult> {
  const startedAt = new Date().toISOString();

  if (!canRunFilesystemAssignmentSync()) {
    return {
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      leaguesProcessed: 0,
      officialsUpdated: 0,
      errors: ["Filesystem recalibration requires a Node data host"],
    };
  }

  const updatedAt = new Date().toISOString();
  const errors: string[] = [];
  let officialsUpdated = 0;
  let leaguesProcessed = 0;

  const rollingCache = loadRollingMetricsCache();
  rollingCache.lastUpdated = updatedAt;

  for (const leagueId of activeLiveLeagueIds()) {
    try {
      const stats = loadLeagueRefStats(leagueId);
      if (!stats) continue;

      leaguesProcessed += 1;
      const updatedSlugs: string[] = [];

      for (const profile of stats.refs) {
        const metrics = recalibrateOfficialMetrics(
          leagueId,
          profile,
          CURRENT_SEASON_LABEL,
          [],
          updatedAt,
        );
        const index = stats.refs.findIndex((ref) => ref.slug === profile.slug);
        if (index < 0) continue;
        stats.refs[index] = applyRecalibratedMetricsToProfile(profile, metrics);
        rollingCache.officials[rollingMetricsCacheKey(leagueId, profile.slug)] = metrics;
        updatedSlugs.push(profile.slug);
        officialsUpdated += 1;
      }

      if (updatedSlugs.length > 0) {
        writeLeagueRefStats(leagueId, stats);
        invalidateRefProfileCaches(leagueId, updatedSlugs);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${leagueId}: ${message}`);
      await dispatchScraperAlert({
        operation: "nightly_recalibration",
        leagueId: leagueId as LeagueId,
        message: `Nightly recalibration failed for ${leagueId}`,
        error: message,
      });
    }
  }

  if (officialsUpdated > 0) {
    writeRollingMetricsCache(rollingCache);
  }

  return {
    ok: errors.length === 0,
    startedAt,
    finishedAt: new Date().toISOString(),
    leaguesProcessed,
    officialsUpdated,
    errors,
  };
}

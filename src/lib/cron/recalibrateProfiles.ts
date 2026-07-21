import type { AutopsyRecord } from "@/lib/cron/recalibrate-profiles-types";
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
import {
  persistRefTeamHistoryRows,
  refTeamHistoryRowsFromProfile,
  updateProfileTeamHistory,
} from "@/lib/cron/ref-team-history-recalibrator";
import { invalidateRefProfileCaches } from "@/lib/cron/invalidate-ref-profile-cache";
import type {
  RecalibrateProfilesInput,
  RecalibrateProfilesResult,
} from "@/lib/cron/recalibrate-profiles-types";
import type { LeagueId } from "@/lib/leagues";

function teamsForAutopsy(autopsy: AutopsyRecord): string[] {
  return [autopsy.homeTeam, autopsy.awayTeam].filter(Boolean);
}

export async function recalibrateProfiles(
  input: RecalibrateProfilesInput,
): Promise<RecalibrateProfilesResult> {
  const startedAt = Date.now();
  const autopsy = input.autopsy;
  const leagueId = autopsy.leagueId as LeagueId;
  const teams = teamsForAutopsy(autopsy);
  const stats = loadLeagueRefStats(leagueId);

  if (!stats) {
    return {
      officialsUpdated: [],
      rollingMetricsWritten: 0,
      teamHistoryRowsUpdated: 0,
      invalidatedPaths: [],
      latencyMs: Date.now() - startedAt,
    };
  }

  const updatedAt = new Date().toISOString();
  const rollingCache = loadRollingMetricsCache();
  rollingCache.lastUpdated = updatedAt;

  const officialsUpdated: string[] = [];
  let teamHistoryRowsUpdated = 0;
  const historyRows = [];

  for (const slug of autopsy.officialSlugs) {
    const index = stats.refs.findIndex((ref) => ref.slug === slug);
    if (index < 0) continue;

    const profile = stats.refs[index]!;
    const metrics = recalibrateOfficialMetrics(
      leagueId,
      profile,
      autopsy.season,
      teams,
      updatedAt,
    );
    const withTeamHistory = updateProfileTeamHistory(profile, teams);
    teamHistoryRowsUpdated += withTeamHistory.rowsUpdated;

    const mergedProfile = applyRecalibratedMetricsToProfile(
      withTeamHistory.profile,
      metrics,
    );
    stats.refs[index] = mergedProfile;
    rollingCache.officials[rollingMetricsCacheKey(leagueId, slug)] = metrics;
    historyRows.push(
      ...refTeamHistoryRowsFromProfile(leagueId, mergedProfile, teams, updatedAt),
    );
    officialsUpdated.push(slug);
  }

  if (officialsUpdated.length > 0) {
    writeLeagueRefStats(leagueId, stats);
    writeRollingMetricsCache(rollingCache);
    await persistRefTeamHistoryRows(historyRows);
  }

  const invalidatedPaths = invalidateRefProfileCaches(leagueId, officialsUpdated);

  return {
    officialsUpdated,
    rollingMetricsWritten: officialsUpdated.length,
    teamHistoryRowsUpdated,
    invalidatedPaths,
    latencyMs: Date.now() - startedAt,
  };
}

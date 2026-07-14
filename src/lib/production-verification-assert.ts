import { isProVerifiedLiveLeague, resolveLeagueVerification } from "@/lib/league-verification";
import { getCachedRefStats, leaguesForPath } from "@/lib/ref-stats-preload";
import type { TeamCrewSplit } from "@/lib/types";

/**
 * Server-only: log when production serves unverified live-league meta or empty team splits.
 * Uses the SSR cache only — never calls getRefStats() loaders (those sync-read multi-MB JSON
 * and blew Worker CPU budgets when run for every league on every request).
 */
export function assertProductionLeagueVerification(pathname: string): void {
  if (process.env.NODE_ENV !== "production") return;

  for (const leagueId of leaguesForPath(pathname)) {
    if (!isProVerifiedLiveLeague(leagueId)) continue;

    const stats = getCachedRefStats(leagueId);
    if (!stats?.refs?.length) continue;

    const meta = stats.meta;
    const v = resolveLeagueVerification(leagueId, meta);
    if (!v.data_verified) {
      console.warn(
        `[production] League ${leagueId} has data_verified=false (source=${meta.data_source ?? meta.source}).`,
      );
    }

    if (v.data_verified && leagueId !== "nba") {
      const teamsWithSplits = Object.values(stats.teamSplits ?? {}).filter(
        (rows: TeamCrewSplit[]) => rows.length > 0,
      ).length;
      if (teamsWithSplits === 0) {
        console.error(
          `[production] League ${leagueId} is verified but teamSplits are empty — matrix baselines will show 0-0. Re-run copy-data-to-public and check-deploy-readiness.`,
        );
      }
    }
  }
}

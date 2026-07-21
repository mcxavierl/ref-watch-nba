import { isLeagueAnalyticsUnlocked } from "@/config/leagues";
import { DASHBOARD_GRID_LEAGUE_IDS } from "@/config/leagues";
import { qualifiesRefAnomaly } from "@/lib/anomaly-surface";
import type { LeagueId } from "@/lib/leagues";
import { loadLeagueStats } from "@/lib/load-league-stats";
import { countNotableSignals } from "@/lib/profile-signals";
import { qualifiedRefs } from "@/lib/rankings";

/** Officials across live leagues that pass the strict anomaly gate. */
export function countRefAnomalyAlerts(): number {
  let total = 0;
  for (const leagueId of DASHBOARD_GRID_LEAGUE_IDS) {
    const { stats } = loadLeagueStats(leagueId);
    if (!isLeagueAnalyticsUnlocked(leagueId, stats)) continue;
    const pool = qualifiedRefs(stats.refs, stats.meta.minSampleSize);
    for (const ref of pool) {
      const notable = countNotableSignals(ref, stats.meta, leagueId as LeagueId);
      if (qualifiesRefAnomaly(ref, leagueId as LeagueId, notable)) {
        total += 1;
      }
    }
  }
  return total;
}

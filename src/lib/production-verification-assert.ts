import {
  getRefStats as getEplRefStats,
} from "@/lib/epl/data";
import {
  getRefStats as getNbaRefStats,
} from "@/lib/data";
import {
  getRefStats as getNflRefStats,
} from "@/lib/nfl/data";
import {
  getRefStats as getNhlRefStats,
} from "@/lib/nhl/data";
import { resolveLeagueVerification, VERIFIED_LIVE_LEAGUE_IDS } from "@/lib/league-verification";

const LOADERS = {
  nba: getNbaRefStats,
  nhl: getNhlRefStats,
  nfl: getNflRefStats,
  epl: getEplRefStats,
} as const;

/** Server-only: log when production serves unverified live-league meta or empty team splits. */
export function assertProductionLeagueVerification(): void {
  if (process.env.NODE_ENV !== "production") return;

  for (const leagueId of VERIFIED_LIVE_LEAGUE_IDS) {
    const loader = LOADERS[leagueId];
    const stats = loader();
    const meta = stats.meta;
    const v = resolveLeagueVerification(leagueId, meta);
    if (!v.data_verified) {
      console.warn(
        `[production] League ${leagueId} has data_verified=false (source=${meta.data_source ?? meta.source}).`,
      );
    }

    if (v.data_verified && leagueId !== "nba") {
      const teamsWithSplits = Object.values(stats.teamSplits).filter(
        (rows) => rows.length > 0,
      ).length;
      if (teamsWithSplits === 0) {
        console.error(
          `[production] League ${leagueId} is verified but teamSplits are empty — matrix baselines will show 0-0. Re-run copy-data-to-public and check-deploy-readiness.`,
        );
      }
    }
  }
}

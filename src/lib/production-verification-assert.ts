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
import { resolveLeagueVerification } from "@/lib/league-verification";

const LOADERS = {
  nba: getNbaRefStats,
  nhl: getNhlRefStats,
  nfl: getNflRefStats,
  epl: getEplRefStats,
} as const;

/** Server-only: log when production serves unverified live-league meta. */
export function assertProductionLeagueVerification(): void {
  if (process.env.NODE_ENV !== "production") return;

  for (const leagueId of Object.keys(LOADERS) as Array<keyof typeof LOADERS>) {
    const loader = LOADERS[leagueId];
    const meta = loader().meta;
    const v = resolveLeagueVerification(leagueId, meta);
    if (!v.data_verified) {
      console.warn(
        `[production] League ${leagueId} has data_verified=false (source=${meta.data_source ?? meta.source}).`,
      );
    }
  }
}

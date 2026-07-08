import {
  getRefStats as getNbaRefStats,
} from "@/lib/data";
import { resolveLeagueVerification } from "@/lib/league-verification";

const LOADERS = {
  nba: getNbaRefStats,
} as const;

/** Server-only: log when production serves unverified NBA meta. */
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

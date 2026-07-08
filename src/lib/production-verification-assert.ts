import {
  getRefStats as getCbbRefStats,
} from "@/lib/cbb/data";
import {
  getRefStats as getCfbRefStats,
} from "@/lib/cfb/data";
import { getRefStats as getNbaRefStats } from "@/lib/data";
import {
  getRefStats as getEplRefStats,
} from "@/lib/epl/data";
import { resolveLeagueVerification } from "@/lib/league-verification";
import { LEAGUE_IDS } from "@/lib/leagues";
import { getRefStats as getNflRefStats } from "@/lib/nfl/data";
import { getRefStats as getNhlRefStats } from "@/lib/nhl/data";

const LOADERS = {
  nba: getNbaRefStats,
  nhl: getNhlRefStats,
  nfl: getNflRefStats,
  epl: getEplRefStats,
  cbb: getCbbRefStats,
  cfb: getCfbRefStats,
} as const;

/** Server-only: log critical when production serves unverified league meta. */
export function assertProductionLeagueVerification(): void {
  if (process.env.NODE_ENV !== "production") return;

  for (const leagueId of LEAGUE_IDS) {
    const loader = LOADERS[leagueId as keyof typeof LOADERS];
    if (!loader) continue;
    const meta = loader().meta;
    const v = resolveLeagueVerification(leagueId, meta);
    if (!v.data_verified) {
      console.error(
        `[CRITICAL] League ${leagueId} has data_verified=false in production (source=${meta.data_source ?? meta.source}).`,
      );
    }
  }
}

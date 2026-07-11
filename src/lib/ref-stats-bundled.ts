import type { RefStatsFile } from "@/lib/types";
import nbaCore from "../../data/ref-stats-core.json";
import nflCore from "../../data/nfl/ref-stats-core.json";
import nhlCore from "../../data/nhl/ref-stats-core.json";
import eplCore from "../../data/epl/ref-stats-core.json";
import laligaCore from "../../data/laliga/ref-stats-core.json";

type BundledLeague = "nba" | "nfl" | "nhl" | "epl" | "laliga";

const BUNDLED_CORE: Record<BundledLeague, RefStatsFile> = {
  nba: nbaCore as RefStatsFile,
  nfl: nflCore as RefStatsFile,
  nhl: nhlCore as RefStatsFile,
  epl: eplCore as RefStatsFile,
  laliga: laligaCore as RefStatsFile,
};

function loadBundledCore(league: BundledLeague): RefStatsFile | null {
  const data = BUNDLED_CORE[league];
  return data?.refs?.length ? data : null;
}

/** Bundled at build time from data/ref-stats-core.json (~500KB). */
export function getBundledNbaRefStatsCore(): RefStatsFile | null {
  return loadBundledCore("nba");
}

/** Slim deploy core — hero counts and ref index without multi-MB team splits. */
export function getBundledLeagueRefStatsCore(
  league: Exclude<BundledLeague, "nba">,
): RefStatsFile | null {
  return loadBundledCore(league);
}

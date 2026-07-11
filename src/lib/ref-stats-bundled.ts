import type { RefStatsFile } from "@/lib/types";

type BundledLeague = "nba" | "nfl" | "nhl" | "epl" | "laliga";

const BUNDLED_CORE: Partial<Record<BundledLeague, RefStatsFile>> = {};

const BUNDLED_PATHS: Record<BundledLeague, string> = {
  nba: "../../data/ref-stats-core.json",
  nfl: "../../data/nfl/ref-stats-core.json",
  nhl: "../../data/nhl/ref-stats-core.json",
  epl: "../../data/epl/ref-stats-core.json",
  laliga: "../../data/laliga/ref-stats-core.json",
};

function loadBundledCore(league: BundledLeague): RefStatsFile | null {
  if (BUNDLED_CORE[league]) return BUNDLED_CORE[league]!;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require(BUNDLED_PATHS[league]) as RefStatsFile;
    if (!data?.refs?.length) return null;
    BUNDLED_CORE[league] = data;
    return data;
  } catch {
    return null;
  }
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

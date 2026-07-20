import type { RefStatsFile } from "@/lib/types";
import nbaCore from "../../data/ref-stats-core.json";
import nflCore from "../../data/nfl/ref-stats-core.json";
import nhlCore from "../../data/nhl/ref-stats-core.json";
import eplCore from "../../data/epl/ref-stats-core.json";
import laligaCore from "../../data/laliga/ref-stats-core.json";

import wnbaCore from "../../data/wnba/ref-stats-core.json";
import cbbCore from "../../data/cbb/ref-stats-core.json";

type BundledLeague = "nba" | "nfl" | "nhl" | "epl" | "laliga" | "wnba" | "cbb";

const BUNDLED_CORE: Record<BundledLeague, RefStatsFile> = {
  nba: nbaCore as unknown as RefStatsFile,
  nfl: nflCore as unknown as RefStatsFile,
  nhl: nhlCore as unknown as RefStatsFile,
  epl: eplCore as unknown as RefStatsFile,
  laliga: laligaCore as unknown as RefStatsFile,
  wnba: wnbaCore as unknown as RefStatsFile,
  cbb: cbbCore as unknown as RefStatsFile,
};

function loadBundledCore(league: BundledLeague): RefStatsFile | null {
  const data = BUNDLED_CORE[league];
  if (!data) return null;
  if (data.refs?.length) return data;
  if (
    data.meta.data_verified === true &&
    (data.meta.totalGamesProcessed ?? 0) > 0
  ) {
    return data;
  }
  return null;
}

/** Prefer disk when it has refs; otherwise fall back to build-time bundled core. */
export function coalesceRefStatsFromDiskAndBundled(
  fromDisk: RefStatsFile | null | undefined,
  bundled: RefStatsFile | null | undefined,
): RefStatsFile | null {
  const diskRefs = fromDisk?.refs?.length ?? 0;
  const bundledRefs = bundled?.refs?.length ?? 0;
  if (diskRefs > 0) return fromDisk!;
  if (bundledRefs > 0) return bundled!;
  return fromDisk ?? bundled ?? null;
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

import type { RefStatsFile } from "@/lib/types";

let bundled: RefStatsFile | null = null;

/** Bundled at build time from data/ref-stats-core.json (~500KB). */
export function getBundledNbaRefStatsCore(): RefStatsFile | null {
  if (bundled) return bundled;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    bundled = require("../../data/ref-stats-core.json") as RefStatsFile;
    return bundled?.refs?.length ? bundled : null;
  } catch {
    return null;
  }
}

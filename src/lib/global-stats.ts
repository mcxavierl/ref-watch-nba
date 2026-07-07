import type { RefStatsFile } from "@/lib/types";

declare global {
  // Populated by middleware on Cloudflare Workers where node:fs cannot read data/.
  var __REFWATCH_NBA_REF_STATS__: RefStatsFile | undefined;
  var __REFWATCH_NHL_REF_STATS__: RefStatsFile | undefined;
}

export type NbaStatsGlobalKey = "__REFWATCH_NBA_REF_STATS__";
export type NhlStatsGlobalKey = "__REFWATCH_NHL_REF_STATS__";

import type { RefStatsFile } from "@/lib/types";

declare global {
  var __REFWATCH_NBA_REF_STATS__: RefStatsFile | undefined;
  var __REFWATCH_NHL_REF_STATS__: RefStatsFile | undefined;
  var __REFWATCH_NFL_REF_STATS__: RefStatsFile | undefined;
}

export type NbaStatsGlobalKey = "__REFWATCH_NBA_REF_STATS__";
export type NflStatsGlobalKey = "__REFWATCH_NFL_REF_STATS__";
export type NhlStatsGlobalKey = "__REFWATCH_NHL_REF_STATS__";

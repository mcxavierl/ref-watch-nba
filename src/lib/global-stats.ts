import type { RefStatsFile } from "@/lib/types";

declare global {
  var __REFWATCH_NBA_REF_STATS__: RefStatsFile | undefined;
  var __REFWATCH_NHL_REF_STATS__: RefStatsFile | undefined;
  var __REFWATCH_NFL_REF_STATS__: RefStatsFile | undefined;
  var __REFWATCH_CBB_REF_STATS__: RefStatsFile | undefined;
  var __REFWATCH_CFB_REF_STATS__: RefStatsFile | undefined;
  var __REFWATCH_EPL_REF_STATS__: RefStatsFile | undefined;
  var __REFWATCH_NBA_GAME_LOGS__: import("@/lib/game-logs").RuntimeGameLogFile | undefined;
  var __REFWATCH_NHL_GAME_LOGS__: import("@/lib/game-logs").RuntimeGameLogFile | undefined;
  var __REFWATCH_NFL_GAME_LOGS__: import("@/lib/game-logs").RuntimeGameLogFile | undefined;
  var __REFWATCH_EPL_GAME_LOGS__: import("@/lib/game-logs").RuntimeGameLogFile | undefined;
  var __REFWATCH_CBB_GAME_LOGS__: import("@/lib/game-logs").RuntimeGameLogFile | undefined;
  var __REFWATCH_CFB_GAME_LOGS__: import("@/lib/game-logs").RuntimeGameLogFile | undefined;
}

export type NbaStatsGlobalKey = "__REFWATCH_NBA_REF_STATS__";
export type NflStatsGlobalKey = "__REFWATCH_NFL_REF_STATS__";
export type NhlStatsGlobalKey = "__REFWATCH_NHL_REF_STATS__";
export type CbbStatsGlobalKey = "__REFWATCH_CBB_REF_STATS__";
export type CfbStatsGlobalKey = "__REFWATCH_CFB_REF_STATS__";
export type EplStatsGlobalKey = "__REFWATCH_EPL_REF_STATS__";

export {
  type StatsQuery,
  type StatsQueryResult,
  type StatsQueryDateRange,
  type StatsQueryLocation,
  type StatsQueryContext,
  type StatsQueryOpponentTier,
  type StatsSampleFlag,
  STATS_QUERY_JSON_SCHEMA,
  MIN_REF_SAMPLE,
  INSUFFICIENT_SAMPLE_THRESHOLD,
  defaultStatsQuery,
  normalizeStatsQuery,
  validateStatsQuery,
  sampleFlagForN,
} from "@/lib/stats-query/schema";

export { wilsonScoreInterval, formatWilsonPct } from "@/lib/stats-query/wilson-ci";
export { fuzzyMatchRef, listCanonicalRefNames } from "@/lib/stats-query/ref-fuzzy-match";
export { resolveTeamAbbr } from "@/lib/stats-query/team-resolve";
export { query_stats } from "@/lib/stats-query/query-stats";
export { parseNlToStatsQuery } from "@/lib/stats-query/nl-parse";
export {
  STATS_QUERY_AGENT_SYSTEM_PROMPT,
  QUERY_STATS_TOOL_DEFINITION,
  formatStatsAnswer,
  runStatsQueryAgent,
  createOpenAiLlmClient,
  isStatQuestion,
  refuseWithoutToolMessage,
  type AgentRunResult,
  type LlmClient,
} from "@/lib/stats-query/agent";
export {
  appendStatsQueryLog,
  readStatsQueryLog,
  type StatsQueryLogEntry,
} from "@/lib/stats-query/query-log";

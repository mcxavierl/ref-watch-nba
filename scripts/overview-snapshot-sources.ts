/**
 * Files that can change `buildCrossLeagueOverview()` output and therefore
 * require refreshing `data/overview-snapshot.json`.
 *
 * Keep in sync with imports in `src/lib/cross-league-overview.ts` and the
 * insight-card pipeline that feeds homepage cards.
 */
export const OVERVIEW_SNAPSHOT_REL = "data/overview-snapshot.json";

/** Logic and config that affect the committed overview snapshot payload. */
export const OVERVIEW_SNAPSHOT_SOURCES = [
  "src/lib/cross-league-overview.ts",
  "src/lib/cross-league-top-findings.ts",
  "src/lib/overview-upcoming-slate.ts",
  "src/lib/overview-matchup-insight.ts",
  "src/lib/overview-slate-shared.ts",
  "src/lib/league-pace-bars.ts",
  "src/lib/league-quick-lists.ts",
  "src/lib/league-home-bias-index.ts",
  "src/lib/load-league-stats.ts",
  "src/lib/soccer-card-metrics.ts",
  "src/lib/ncaa-audit-status.ts",
  "src/lib/ncaa-conference-gate.ts",
  "src/config/leagues.ts",
  "src/lib/insights/insights-query.ts",
  "src/lib/insights/generator-core.ts",
  "src/lib/homepage-insight-gates.ts",
  "src/lib/insight-editorial.ts",
  "src/config/methodology.ts",
  "data/overview-insights.json",
] as const;

export function isOverviewSnapshotSource(file: string): boolean {
  return OVERVIEW_SNAPSHOT_SOURCES.some((rel) => file === rel || file.endsWith(`/${rel}`));
}

/** Committed league stats and slate inputs that invalidate the overview snapshot. */
const OVERVIEW_DATA_DEPENDENCY_PATTERNS = [
  /^data\/baselines\.json$/,
  /^data\/overview-insights\.json$/,
  /^data\/assignments\.json$/,
  /^data\/(?:ref-stats(?:-core)?|game-logs|team-splits)\.json$/,
  /^data\/[^/]+\/(?:ref-stats(?:-core)?|game-logs|team-splits|assignments)\.json$/,
] as const;

export function isOverviewDataDependency(file: string): boolean {
  const normalized = file.replace(/\\/g, "/");
  return OVERVIEW_DATA_DEPENDENCY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isOverviewSnapshotInvalidatingChange(file: string): boolean {
  return (
    isOverviewSnapshotSource(file) ||
    isOverviewDataDependency(file) ||
    file.endsWith(OVERVIEW_SNAPSHOT_REL)
  );
}

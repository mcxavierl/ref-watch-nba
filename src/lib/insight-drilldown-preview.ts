export const INSIGHT_DRILLDOWN_GAMES_PREVIEW_COUNT = 5;

export function visibleInsightDrilldownGames<T>(
  games: T[],
  expanded: boolean,
  previewCount = INSIGHT_DRILLDOWN_GAMES_PREVIEW_COUNT,
): T[] {
  return expanded ? games : games.slice(0, previewCount);
}

export function hiddenInsightDrilldownGameCount(
  games: unknown[],
  expanded: boolean,
  previewCount = INSIGHT_DRILLDOWN_GAMES_PREVIEW_COUNT,
): number {
  if (expanded) return 0;
  return Math.max(0, games.length - previewCount);
}

export function insightDrilldownExpandLabel(
  hiddenCount: number,
  expanded: boolean,
): string {
  if (expanded) return "Show fewer games";
  return `View ${hiddenCount} more game${hiddenCount === 1 ? "" : "s"}`;
}

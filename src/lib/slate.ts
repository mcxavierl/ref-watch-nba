/** Re-export slate query helpers and rolling windows for platform-wide use. */
export {
  ACTIVE_SLATE_LOOKAHEAD_MS,
  ACTIVE_SLATE_LOOKBACK_MS,
  RECENT_TRENDS_LOOKBACK_MS,
  activeSlateWindowBounds,
  isWithinActiveSlateWindow,
  isWithinRecentTrendsWindow,
  recentTrendsWindowStartMs,
  resolveGameTimestampMs,
} from "@/lib/query-windows";

export {
  compareSlateChronology,
  groupOverviewSlateByLeague,
  HOMEPAGE_SLATE_GRID_SIZE,
  isWithinLiveSlateWindow,
  selectHomepageLiveSlateGames,
  selectPublishedHomepageSlateGames,
  sortSlateChronology,
  type OverviewSlateEntry,
  type OverviewUpcomingSlate,
} from "@/lib/overview-slate-shared";

export { getLiveSlateGames, type LiveSlateResult } from "@/lib/live-slate-engine";

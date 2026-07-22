/**
 * Rolling time windows for slate and trend queries.
 * Mirrors SQL intervals: NOW() - INTERVAL '…' through NOW() + INTERVAL '…'.
 */

/** Active slate lookback: game_timestamp >= NOW() - 6 hours */
export const ACTIVE_SLATE_LOOKBACK_MS = 6 * 60 * 60 * 1000;

/** Active slate lookahead: game_timestamp <= NOW() + 30 hours */
export const ACTIVE_SLATE_LOOKAHEAD_MS = 30 * 60 * 60 * 1000;

/** Recent trends window: game_timestamp >= NOW() - 30 days */
export const RECENT_TRENDS_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

export type TimestampedGame = {
  slateStartAt?: string;
  slateDate?: string;
};

export function resolveGameTimestampMs(entry: TimestampedGame): number | null {
  if (entry.slateStartAt) {
    const parsed = Date.parse(entry.slateStartAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (entry.slateDate) {
    const parsed = Date.parse(`${entry.slateDate}T12:00:00Z`);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Active slate window relative to `now` (default: current time). */
export function activeSlateWindowBounds(nowMs: number = Date.now()): {
  windowStartMs: number;
  windowEndMs: number;
} {
  return {
    windowStartMs: nowMs - ACTIVE_SLATE_LOOKBACK_MS,
    windowEndMs: nowMs + ACTIVE_SLATE_LOOKAHEAD_MS,
  };
}

/** Recent trends window start relative to `now`. */
export function recentTrendsWindowStartMs(nowMs: number = Date.now()): number {
  return nowMs - RECENT_TRENDS_LOOKBACK_MS;
}

export function isWithinActiveSlateWindow(
  timestampMs: number | null,
  nowMs: number = Date.now(),
): boolean {
  if (timestampMs === null) return true;
  const { windowStartMs, windowEndMs } = activeSlateWindowBounds(nowMs);
  return timestampMs >= windowStartMs && timestampMs <= windowEndMs;
}

export function isWithinRecentTrendsWindow(
  timestampMs: number | null,
  nowMs: number = Date.now(),
): boolean {
  if (timestampMs === null) return false;
  return timestampMs >= recentTrendsWindowStartMs(nowMs);
}

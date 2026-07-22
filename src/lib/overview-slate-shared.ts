import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import { leagueHubHref, LEAGUES, type LeagueId } from "@/lib/leagues";
import type { SlateGamePhase } from "@/lib/slate-game-phase";
import {
  ACTIVE_SLATE_LOOKAHEAD_MS,
  ACTIVE_SLATE_LOOKBACK_MS,
  activeSlateWindowBounds,
  resolveGameTimestampMs,
} from "@/lib/query-windows";

export {
  ACTIVE_SLATE_LOOKAHEAD_MS as LIVE_SLATE_LOOKAHEAD_MS,
  ACTIVE_SLATE_LOOKBACK_MS as LIVE_SLATE_LOOKBACK_MS,
  resolveGameTimestampMs,
} from "@/lib/query-windows";

export type OverviewSlateStatus = "live" | "scheduled" | "final";

export type OverviewSlateEntry = {
  leagueId: LeagueId;
  leagueLabel: string;
  leagueShortLabel: string;
  href: string;
  gameId: string;
  matchup: string;
  awayTeam: string;
  homeTeam: string;
  headRef?: string;
  crewCount: number;
  status: OverviewSlateStatus;
  gamePhase?: SlateGamePhase;
  awayScore?: number;
  homeScore?: number;
  gameStatus?: string;
  gameClock?: string;
  gamePeriod?: string;
  slateDate?: string;
  slateStartAt?: string;
  matchupInsight?: string;
  lastMeetingLine?: string;
  /** Narrative H2H note for upcoming cards (recent meetings only). */
  gameContextLine?: string;
  teamContextLine?: string;
  officialsLine?: string;
  metadataLine?: string;
  seasonStageNote?: string;
  preview?: GameSlatePreviewPayload;
  /** Top ref-preview insights for compact upcoming cards when crew is assigned. */
  previewCardInsights?: string[];
  /** Full ref-intelligence copy for upcoming game cards (server-built, no truncation). */
  upcomingCardRefInsights?: string[];
};

export type OverviewLeagueNote = {
  leagueId: LeagueId;
  leagueShortLabel: string;
  note: string;
  slateDate?: string;
};

export type OverviewLeagueSlateGroup = {
  leagueId: LeagueId;
  leagueLabel: string;
  leagueShortLabel: string;
  href: string;
  liveCount: number;
  scheduledCount: number;
  games: OverviewSlateEntry[];
};

export type OverviewUpcomingSlate = {
  inSeason: boolean;
  hasLiveCrews: boolean;
  totalGames: number;
  totalScheduled: number;
  lastUpdated: string | null;
  games: OverviewSlateEntry[];
  leagueGroups: OverviewLeagueSlateGroup[];
  leagueNotes: OverviewLeagueNote[];
};

/** Max upcoming cards on a league hub (confirmed crews first). */
export const LEAGUE_UPCOMING_SLATE_LIMIT = 6;

/** Homepage grid: 3×3 upcoming cards. */
export const HOMEPAGE_SLATE_GRID_SIZE = 9;

/** Rolling window: now - 6h through now + 30h. Live/final games bypass the upper bound. */
export function isWithinLiveSlateWindow(
  entry: OverviewSlateEntry,
  nowMs: number,
): boolean {
  if (entry.status === "live" || entry.gamePhase === "live") return true;

  const timestampMs = resolveGameTimestampMs(entry);
  const { windowStartMs, windowEndMs } = activeSlateWindowBounds(nowMs);

  if (entry.status === "final" || entry.gamePhase === "final") {
    if (timestampMs === null) return true;
    return timestampMs >= windowStartMs;
  }

  if (timestampMs === null) return true;
  return timestampMs >= windowStartMs && timestampMs <= windowEndMs;
}

function mergeSlateSelections(
  primary: OverviewSlateEntry[],
  backfill: OverviewSlateEntry[],
  limit: number,
): OverviewSlateEntry[] {
  const selected: OverviewSlateEntry[] = [];
  const seen = new Set<string>();

  for (const game of [...primary, ...backfill]) {
    const key = `${game.leagueId}:${game.gameId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(game);
    if (selected.length >= limit) break;
  }

  return selected;
}

/**
 * Pick homepage slate cards from the rolling window.
 * Live crews stay in-window first; otherwise show published upcoming matchups (up to nine).
 */
export function selectHomepageLiveSlateGames(
  games: OverviewSlateEntry[],
  now: Date = new Date(),
  limit = HOMEPAGE_SLATE_GRID_SIZE,
): OverviewSlateEntry[] {
  const nowMs = now.getTime();
  const published = selectPublishedHomepageSlateGames(games, now, limit);
  const inWindow = sortSlateChronology(
    games.filter((game) => isWithinLiveSlateWindow(game, nowMs)),
  );

  const liveGames = inWindow.filter(
    (game) => game.status === "live" || game.gamePhase === "live",
  );

  if (liveGames.length > 0) {
    return mergeSlateSelections(inWindow, published, limit);
  }

  if (published.length > 0) return published;

  const upcomingGames = inWindow.filter(
    (game) => game.status === "scheduled" && game.gamePhase !== "live",
  );
  if (upcomingGames.length > 0) {
    return upcomingGames.slice(0, limit);
  }

  return inWindow.slice(0, limit);
}

/** Noon Eastern on the day after `slateDate` (slate rotates forward). */
export function slateRotateAtMs(slateDate: string): number {
  const [year, month, day] = slateDate.split("-").map(Number);
  if (!year || !month || !day) return Number.MAX_SAFE_INTEGER;
  // Noon Eastern ≈ 16:00 UTC during EDT, 17:00 UTC during EST.
  return Date.UTC(year, month - 1, day + 1, 16, 0, 0);
}

/** Published slate games stay visible until noon Eastern the following day. */
export function isPublishedSlateGameVisible(
  entry: OverviewSlateEntry,
  nowMs: number,
): boolean {
  if (entry.status === "live" || entry.gamePhase === "live") return true;
  if (!entry.slateDate) return true;
  return nowMs < slateRotateAtMs(entry.slateDate);
}

/**
 * Pick up to nine published matchups for the homepage grid.
 * Prefers active slate-day games, then backfills with the next published entries.
 */
export function selectPublishedHomepageSlateGames(
  games: OverviewSlateEntry[],
  now: Date = new Date(),
  limit = HOMEPAGE_SLATE_GRID_SIZE,
): OverviewSlateEntry[] {
  const nowMs = now.getTime();
  const visible = sortSlateChronology(games).filter((game) =>
    isPublishedSlateGameVisible(game, nowMs),
  );
  const selected: OverviewSlateEntry[] = [];
  const seen = new Set<string>();

  for (const game of visible) {
    const key = `${game.leagueId}:${game.gameId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(game);
    if (selected.length >= limit) break;
  }

  return selected;
}

export function formatLeagueSlateCounts(liveCount: number, scheduledCount: number): string {
  const parts: string[] = [];
  if (liveCount > 0) {
    parts.push(`${liveCount} live`);
  }
  if (scheduledCount > 0) {
    parts.push(`${scheduledCount} scheduled`);
  }
  return parts.join(" · ");
}

function slateChronologyMs(entry: OverviewSlateEntry): number {
  if (entry.slateStartAt) {
    const parsed = Date.parse(entry.slateStartAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (entry.slateDate) {
    const parsed = Date.parse(`${entry.slateDate}T12:00:00`);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.MAX_SAFE_INTEGER;
}

function slateStatusRank(status: OverviewSlateStatus): number {
  if (status === "live") return 0;
  if (status === "scheduled") return 1;
  return 2;
}

/** Live first, then soonest start time, then matchup label. */
export function compareSlateChronology(
  a: OverviewSlateEntry,
  b: OverviewSlateEntry,
): number {
  const liveDelta = slateStatusRank(a.status) - slateStatusRank(b.status);
  if (liveDelta !== 0) return liveDelta;
  const timeDelta = slateChronologyMs(a) - slateChronologyMs(b);
  if (timeDelta !== 0) return timeDelta;
  return a.matchup.localeCompare(b.matchup);
}

export function sortSlateChronology(games: OverviewSlateEntry[]): OverviewSlateEntry[] {
  return [...games].sort(compareSlateChronology);
}

function leagueSortOrder(): Map<LeagueId, number> {
  return new Map<LeagueId, number>(
    activeLiveLeagueIds().map((id, index) => [id, index]),
  );
}

/** Group slate entries by league, preserving live-first ordering within each group. */
export function groupOverviewSlateByLeague(games: OverviewSlateEntry[]): OverviewLeagueSlateGroup[] {
  const order = leagueSortOrder();
  const byLeague = new Map<LeagueId, OverviewSlateEntry[]>();

  for (const game of games) {
    const list = byLeague.get(game.leagueId) ?? [];
    list.push(game);
    byLeague.set(game.leagueId, list);
  }

  return [...byLeague.entries()]
    .sort(([a], [b]) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
    .map(([leagueId, leagueGames]) => {
      const league = LEAGUES[leagueId];
      const liveCount = leagueGames.filter(
        (game) => game.status === "live" || game.gamePhase === "live",
      ).length;
      const scheduledCount = leagueGames.filter(
        (game) => game.status === "scheduled" && game.gamePhase !== "live",
      ).length;
      const sortedGames = sortSlateChronology(leagueGames);

      return {
        leagueId,
        leagueLabel: league.label,
        leagueShortLabel: league.shortLabel,
        href: leagueHubHref(leagueId),
        liveCount,
        scheduledCount,
        games: sortedGames,
      };
    });
}

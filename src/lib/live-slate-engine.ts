import * as fs from "node:fs";
import * as path from "node:path";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";
import {
  buildLeagueUpcomingSlateFromAssignments,
  collectLeagueSlateEntries,
  HOMEPAGE_SLATE_GRID_SIZE,
  selectHomepageSlateGrid,
} from "@/lib/overview-upcoming-slate";
import {
  compareSlateChronology,
  groupOverviewSlateByLeague,
  type OverviewSlateEntry,
  type OverviewUpcomingSlate,
} from "@/lib/overview-slate-shared";
import type { AssignmentsFile } from "@/lib/types";

/** Include live games and finals from the last 6 hours. */
export const LIVE_SLATE_LOOKBACK_MS = 6 * 60 * 60 * 1000;

/** Include upcoming games starting within the next 30 hours. */
export const LIVE_SLATE_LOOKAHEAD_MS = 30 * 60 * 60 * 1000;

export type LiveSlateQueryOptions = {
  now?: Date;
  leagueId?: LeagueId;
  limit?: number;
};

export type LiveSlateResult = OverviewUpcomingSlate & {
  fetchedAt: string;
};

function assignmentsPath(leagueId: LeagueId): string {
  const root = process.cwd();
  if (leagueId === "nba") return path.join(root, "data/assignments.json");
  return path.join(root, "data", leagueId, "assignments.json");
}

/** Resolve kickoff timestamp used for rolling window filters. */
export function resolveGameTimestampMs(
  entry: Pick<OverviewSlateEntry, "slateStartAt" | "slateDate">,
): number | null {
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

/** Rolling window: now - 6h through now + 30h. Live/final games bypass the upper bound. */
export function isWithinLiveSlateWindow(
  entry: OverviewSlateEntry,
  nowMs: number,
): boolean {
  if (entry.status === "live" || entry.gamePhase === "live") return true;

  const timestampMs = resolveGameTimestampMs(entry);
  const windowStart = nowMs - LIVE_SLATE_LOOKBACK_MS;
  const windowEnd = nowMs + LIVE_SLATE_LOOKAHEAD_MS;

  if (entry.status === "final" || entry.gamePhase === "final") {
    if (timestampMs === null) return true;
    return timestampMs >= windowStart;
  }

  if (timestampMs === null) return true;
  return timestampMs >= windowStart && timestampMs <= windowEnd;
}

/** Status priority: LIVE first, UPCOMING second, FINAL third; then kickoff ascending. */
export function compareLiveSlatePriority(
  a: OverviewSlateEntry,
  b: OverviewSlateEntry,
): number {
  return compareSlateChronology(a, b);
}

function loadLeagueSlateEntries(leagueId: LeagueId): {
  entries: OverviewSlateEntry[];
  lastUpdated: string | null;
  leagueNote: OverviewUpcomingSlate["leagueNotes"][number] | null;
} {
  const filePath = assignmentsPath(leagueId);
  if (!fs.existsSync(filePath)) {
    return { entries: [], lastUpdated: null, leagueNote: null };
  }

  try {
    const file = JSON.parse(fs.readFileSync(filePath, "utf8")) as AssignmentsFile;
    const slate = buildLeagueUpcomingSlateFromAssignments(leagueId, file);
    const entries = collectLeagueSlateEntries(leagueId, file);
    return {
      entries,
      lastUpdated: file.lastUpdated ?? null,
      leagueNote: slate.leagueNote,
    };
  } catch {
    return { entries: [], lastUpdated: null, leagueNote: null };
  }
}

/**
 * Select games for the live slate dashboard using a rolling timestamp window
 * instead of hardcoded daily snapshots.
 */
export function getLiveSlateGames(options: LiveSlateQueryOptions = {}): LiveSlateResult {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const leagueIds = options.leagueId
    ? [options.leagueId]
    : activeLiveLeagueIds();

  const games: OverviewSlateEntry[] = [];
  const seenGameKeys = new Set<string>();
  const leagueNotes: OverviewUpcomingSlate["leagueNotes"] = [];
  let lastUpdated: string | null = null;

  for (const leagueId of leagueIds) {
    const { entries, lastUpdated: leagueUpdated, leagueNote } = loadLeagueSlateEntries(leagueId);
    if (leagueUpdated && (!lastUpdated || leagueUpdated > lastUpdated)) {
      lastUpdated = leagueUpdated;
    }
    if (leagueNote) leagueNotes.push(leagueNote);

    for (const entry of entries) {
      if (!isWithinLiveSlateWindow(entry, nowMs)) continue;
      const key = `${leagueId}:${entry.gameId}`;
      if (seenGameKeys.has(key)) continue;
      seenGameKeys.add(key);
      games.push(entry);
    }
  }

  games.sort(compareLiveSlatePriority);

  const limit = options.limit ?? HOMEPAGE_SLATE_GRID_SIZE;
  const limitedGames =
    options.leagueId !== undefined
      ? games.slice(0, limit)
      : selectHomepageSlateGrid(games);

  const liveGames = games.filter(
    (game) => game.status === "live" || game.gamePhase === "live",
  );
  const scheduledGames = games.filter(
    (game) => game.status === "scheduled" && game.gamePhase !== "live",
  );

  return {
    inSeason: games.length > 0,
    hasLiveCrews: liveGames.length > 0,
    totalGames: liveGames.length,
    totalScheduled: scheduledGames.length,
    lastUpdated,
    games: limitedGames,
    leagueGroups: groupOverviewSlateByLeague(games),
    leagueNotes,
    fetchedAt: now.toISOString(),
  };
}

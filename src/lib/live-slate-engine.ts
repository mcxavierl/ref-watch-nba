import * as fs from "node:fs";
import * as path from "node:path";
import { getCachedAssignments } from "@/lib/assignments-preload";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";
import { allowNodeDataFs } from "@/lib/production-data-guard";
import {
  buildLeagueUpcomingSlateFromAssignments,
  collectLeagueSlateEntries,
} from "@/lib/overview-upcoming-slate";
import {
  compareSlateChronology,
  groupOverviewSlateByLeague,
  HOMEPAGE_SLATE_GRID_SIZE,
  isWithinLiveSlateWindow,
  LIVE_SLATE_LOOKAHEAD_MS,
  LIVE_SLATE_LOOKBACK_MS,
  resolveGameTimestampMs,
  selectPublishedHomepageSlateGames,
  type OverviewSlateEntry,
  type OverviewUpcomingSlate,
} from "@/lib/overview-slate-shared";
import type { AssignmentsFile } from "@/lib/types";

export {
  LIVE_SLATE_LOOKAHEAD_MS,
  LIVE_SLATE_LOOKBACK_MS,
  isWithinLiveSlateWindow,
  resolveGameTimestampMs,
} from "@/lib/overview-slate-shared";

export type LiveSlateQueryOptions = {
  now?: Date;
  leagueId?: LeagueId;
  limit?: number;
  /** When true, return every game in the rolling window (not just the homepage grid). */
  allGames?: boolean;
};

export type LiveSlateResult = OverviewUpcomingSlate & {
  fetchedAt: string;
};

function assignmentsPath(leagueId: LeagueId): string {
  const root = process.cwd();
  if (leagueId === "nba") return path.join(root, "data/assignments.json");
  return path.join(root, "data", leagueId, "assignments.json");
}

/** Status priority: LIVE first, UPCOMING second, FINAL third; then kickoff ascending. */
export function compareLiveSlatePriority(
  a: OverviewSlateEntry,
  b: OverviewSlateEntry,
): number {
  return compareSlateChronology(a, b);
}

function loadAssignmentsFile(leagueId: LeagueId): AssignmentsFile | null {
  const cached = getCachedAssignments(leagueId);
  if (cached) return cached;
  if (!allowNodeDataFs()) return null;

  const filePath = assignmentsPath(leagueId);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as AssignmentsFile;
  } catch {
    return null;
  }
}

function loadLeagueSlateEntries(leagueId: LeagueId): {
  entries: OverviewSlateEntry[];
  lastUpdated: string | null;
  leagueNote: OverviewUpcomingSlate["leagueNotes"][number] | null;
} {
  const file = loadAssignmentsFile(leagueId);
  if (!file) {
    return { entries: [], lastUpdated: null, leagueNote: null };
  }

  try {
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
 * Select slate games for the live dashboard using a rolling kickoff window.
 * Homepage grids surface live crews first, then upcoming scheduled matchups in-window.
 */
export function getLiveSlateGames(options: LiveSlateQueryOptions = {}): LiveSlateResult {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const leagueIds = options.leagueId
    ? [options.leagueId]
    : activeLiveLeagueIds();

  const allGames: OverviewSlateEntry[] = [];
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
      const key = `${leagueId}:${entry.gameId}`;
      if (seenGameKeys.has(key)) continue;
      seenGameKeys.add(key);
      allGames.push(entry);
    }
  }

  allGames.sort(compareLiveSlatePriority);

  const windowedGames = allGames.filter((game) => isWithinLiveSlateWindow(game, nowMs));
  const limit = options.limit ?? HOMEPAGE_SLATE_GRID_SIZE;
  const limitedGames = options.allGames
    ? windowedGames
    : options.leagueId !== undefined
      ? windowedGames.slice(0, limit)
      : selectPublishedHomepageSlateGames(allGames, now, limit);

  const liveGames = windowedGames.filter(
    (game) => game.status === "live" || game.gamePhase === "live",
  );
  const scheduledGames = windowedGames.filter(
    (game) => game.status === "scheduled" && game.gamePhase !== "live",
  );

  return {
    inSeason: allGames.length > 0,
    hasLiveCrews: liveGames.length > 0,
    totalGames: liveGames.length,
    totalScheduled: scheduledGames.length,
    lastUpdated,
    games: limitedGames,
    leagueGroups: groupOverviewSlateByLeague(windowedGames),
    leagueNotes,
    fetchedAt: now.toISOString(),
  };
}

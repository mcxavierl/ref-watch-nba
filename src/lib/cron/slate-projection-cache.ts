import * as fs from "node:fs";
import * as path from "node:path";
import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import { buildGameSlatePreview } from "@/lib/game-slate-preview";
import { isSlatePreviewLeague } from "@/lib/game-slate-preview-adapters";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";
import type {
  SlateProjectionCacheEntry,
  SlateProjectionCacheFile,
} from "@/lib/cron/slate-poller-types";
import type { AssignmentGame, AssignmentsFile, OddsFile } from "@/lib/types";

export const SLATE_PROJECTION_CACHE_PATH = path.join(
  process.cwd(),
  "data",
  "slate-projection-cache.json",
);

const MIN_CREW_FOR_PROJECTION = 1;

function assignmentsPath(leagueId: LeagueId): string {
  const root = process.cwd();
  if (leagueId === "nba") return path.join(root, "data/assignments.json");
  return path.join(root, "data", leagueId, "assignments.json");
}

function oddsPath(leagueId: LeagueId): string {
  const root = process.cwd();
  if (leagueId === "nba") return path.join(root, "data/odds.json");
  return path.join(root, "data", leagueId, "odds.json");
}

function loadAssignments(leagueId: LeagueId): AssignmentsFile | null {
  const filePath = assignmentsPath(leagueId);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as AssignmentsFile;
  } catch {
    return null;
  }
}

function loadOdds(leagueId: LeagueId): OddsFile {
  const filePath = oddsPath(leagueId);
  if (!fs.existsSync(filePath)) {
    return { lastUpdated: "", source: "seeded", lines: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as OddsFile;
  } catch {
    return { lastUpdated: "", source: "seeded", lines: [] };
  }
}

function allAssignmentGames(file: AssignmentsFile): AssignmentGame[] {
  return [...file.games, ...(file.scheduledGames ?? [])];
}

export function countSlateGames(leagueIds: LeagueId[] = activeLiveLeagueIds()): {
  gamesUpdated: number;
  crewsAssignedCount: number;
} {
  let gamesUpdated = 0;
  let crewsAssignedCount = 0;

  for (const leagueId of leagueIds) {
    const file = loadAssignments(leagueId);
    if (!file) continue;
    const games = allAssignmentGames(file);
    gamesUpdated += games.length;
    crewsAssignedCount += games.filter((game) => game.crew.length >= MIN_CREW_FOR_PROJECTION).length;
  }

  return { gamesUpdated, crewsAssignedCount };
}

export function buildSlateProjectionCache(
  leagueIds: LeagueId[] = activeLiveLeagueIds(),
): SlateProjectionCacheFile {
  const games: Record<string, SlateProjectionCacheEntry> = {};
  const updatedAt = new Date().toISOString();

  for (const leagueId of leagueIds) {
    if (!isSlatePreviewLeague(leagueId)) continue;
    const file = loadAssignments(leagueId);
    if (!file) continue;
    const odds = loadOdds(leagueId);

    for (const game of allAssignmentGames(file)) {
      if (game.crew.length < MIN_CREW_FOR_PROJECTION) continue;
      const preview = buildGameSlatePreview(leagueId, game, odds);
      if (!preview) continue;
      const projectionEvidence = buildProjectionEvidence(preview);
      const key = `${leagueId}:${game.id}`;
      games[key] = {
        gameId: game.id,
        leagueId,
        matchup: game.matchup,
        crewCount: game.crew.length,
        updatedAt,
        preview,
        projectionEvidence,
      };
    }
  }

  return {
    lastUpdated: updatedAt,
    games,
  };
}

export function writeSlateProjectionCache(
  cache: SlateProjectionCacheFile,
  filePath = SLATE_PROJECTION_CACHE_PATH,
): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(cache, null, 2)}\n`);
}

export function loadSlateProjectionCache(
  filePath = SLATE_PROJECTION_CACHE_PATH,
): SlateProjectionCacheFile | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as SlateProjectionCacheFile;
  } catch {
    return null;
  }
}

export function getCachedProjection(
  leagueId: LeagueId,
  gameId: string,
  filePath = SLATE_PROJECTION_CACHE_PATH,
): SlateProjectionCacheEntry | null {
  const cache = loadSlateProjectionCache(filePath);
  return cache?.games[`${leagueId}:${gameId}`] ?? null;
}

import * as fs from "node:fs";
import * as path from "node:path";
import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import { getCachedProjection } from "@/lib/cron/slate-projection-cache";
import { buildGameSlatePreview } from "@/lib/game-slate-preview";
import { isSlatePreviewLeague } from "@/lib/game-slate-preview-adapters";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import { LEAGUES, LEAGUE_IDS, type LeagueId } from "@/lib/leagues";
import {
  buildLeagueUpcomingSlateFromAssignments,
  type OverviewSlateEntry,
} from "@/lib/overview-upcoming-slate";
import type { AssignmentsFile, OddsFile } from "@/lib/types";

export type UpcomingGameApiEntry = {
  gameId: string;
  leagueId: LeagueId;
  leagueLabel: string;
  matchup: string;
  awayTeam: string;
  homeTeam: string;
  slateDate: string;
  slateStartAt?: string;
  status: OverviewSlateEntry["status"];
  crew: Array<{
    name: string;
    number: number;
    slug: string;
    role?: string;
  }>;
  projectionEvidence: ReturnType<typeof buildProjectionEvidence> | null;
};

function assignmentsPath(leagueId: LeagueId): string {
  const root = process.cwd();
  if (leagueId === "nba") return path.join(root, "data/assignments.json");
  return path.join(root, "data", leagueId, "assignments.json");
}

function loadLeagueOdds(leagueId: LeagueId): OddsFile {
  const root = process.cwd();
  const oddsPath =
    leagueId === "nba"
      ? path.join(root, "data/odds.json")
      : path.join(root, "data", leagueId, "odds.json");
  if (!fs.existsSync(oddsPath)) {
    return { lastUpdated: "", source: "seeded", lines: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(oddsPath, "utf8")) as OddsFile;
  } catch {
    return { lastUpdated: "", source: "seeded", lines: [] };
  }
}

function toApiEntry(entry: OverviewSlateEntry): UpcomingGameApiEntry {
  const preview = entry.preview;
  const cached = preview ? getCachedProjection(entry.leagueId, entry.gameId) : null;
  return {
    gameId: entry.gameId,
    leagueId: entry.leagueId,
    leagueLabel: entry.leagueLabel,
    matchup: entry.matchup,
    awayTeam: entry.awayTeam,
    homeTeam: entry.homeTeam,
    slateDate: entry.slateDate ?? "",
    slateStartAt: entry.slateStartAt,
    status: entry.status,
    crew:
      preview?.crew.map((official) => ({
        name: official.name,
        number: official.number,
        slug: official.slug,
        role: official.role,
      })) ?? [],
    projectionEvidence:
      cached?.projectionEvidence ??
      (preview ? buildProjectionEvidence(preview) : null),
  };
}

export function parseLeagueId(value: string | null): LeagueId | null {
  if (!value) return null;
  return LEAGUE_IDS.includes(value as LeagueId) ? (value as LeagueId) : null;
}

export function loadUpcomingGames(options?: {
  leagueId?: LeagueId;
  limit?: number;
}): {
  games: UpcomingGameApiEntry[];
  lastUpdated: string | null;
} {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
  const leagueIds = options?.leagueId ? [options.leagueId] : activeLiveLeagueIds();
  const games: UpcomingGameApiEntry[] = [];
  let lastUpdated: string | null = null;

  for (const leagueId of leagueIds) {
    const filePath = assignmentsPath(leagueId);
    if (!fs.existsSync(filePath)) continue;
    try {
      const file = JSON.parse(fs.readFileSync(filePath, "utf8")) as AssignmentsFile;
      if (file.lastUpdated && (!lastUpdated || file.lastUpdated > lastUpdated)) {
        lastUpdated = file.lastUpdated;
      }
      const slate = buildLeagueUpcomingSlateFromAssignments(leagueId, file);
      for (const game of slate.leagueGroup?.games ?? []) {
        if (!game.preview && isSlatePreviewLeague(leagueId)) {
          const assignment = [...file.games, ...(file.scheduledGames ?? [])].find(
            (row) => row.id === game.gameId,
          );
          if (assignment) {
            const preview = buildGameSlatePreview(
              leagueId,
              assignment,
              loadLeagueOdds(leagueId),
            );
            if (preview) {
              games.push(toApiEntry({ ...game, preview }));
              continue;
            }
          }
        }
        games.push(toApiEntry(game));
      }
    } catch {
      continue;
    }
  }

  games.sort((a, b) => {
    const aTime = Date.parse(a.slateStartAt ?? a.slateDate);
    const bTime = Date.parse(b.slateStartAt ?? b.slateDate);
    return aTime - bTime;
  });

  return {
    games: games.slice(0, limit),
    lastUpdated,
  };
}

export function leagueLabel(leagueId: LeagueId): string {
  return LEAGUES[leagueId].label;
}

import * as fs from "node:fs";
import * as path from "node:path";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import { leagueHubHref, LEAGUES, type LeagueId } from "@/lib/leagues";
import { buildOverviewMatchupInsight } from "@/lib/overview-matchup-insight";
import type { AssignmentsFile } from "@/lib/types";

export type OverviewSlateStatus = "live" | "scheduled";

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
  slateDate?: string;
  matchupInsight?: string;
};

export type OverviewLeagueNote = {
  leagueId: LeagueId;
  leagueShortLabel: string;
  note: string;
  slateDate?: string;
};

export type OverviewUpcomingSlate = {
  inSeason: boolean;
  hasLiveCrews: boolean;
  totalGames: number;
  totalScheduled: number;
  lastUpdated: string | null;
  games: OverviewSlateEntry[];
  leagueNotes: OverviewLeagueNote[];
};

function assignmentsPath(leagueId: LeagueId): string {
  const root = process.cwd();
  if (leagueId === "nba") return path.join(root, "data/assignments.json");
  return path.join(root, "data", leagueId, "assignments.json");
}

function pushEntry(
  games: OverviewSlateEntry[],
  leagueId: LeagueId,
  file: AssignmentsFile,
  game: AssignmentsFile["games"][number],
  status: OverviewSlateStatus,
): void {
  const league = LEAGUES[leagueId];
  const headRef =
    game.crew.find((o) => o.role === "referee")?.name ?? game.crew[0]?.name;
  games.push({
    leagueId,
    leagueLabel: league.label,
    leagueShortLabel: league.shortLabel,
    href: leagueHubHref(leagueId),
    gameId: game.id,
    matchup: game.matchup,
    awayTeam: game.awayTeam,
    homeTeam: game.homeTeam,
    headRef,
    crewCount: game.crew.length,
    status,
    slateDate: file.date,
    matchupInsight: buildOverviewMatchupInsight(leagueId, game.awayTeam, game.homeTeam),
  });
}

/** Aggregate tonight's assignments across live leagues (build-time / snapshot). */
export function buildOverviewUpcomingSlate(): OverviewUpcomingSlate {
  const games: OverviewSlateEntry[] = [];
  const leagueNotes: OverviewLeagueNote[] = [];
  let lastUpdated: string | null = null;

  for (const leagueId of activeLiveLeagueIds()) {
    const filePath = assignmentsPath(leagueId);
    if (!fs.existsSync(filePath)) continue;

    try {
      const file = JSON.parse(fs.readFileSync(filePath, "utf8")) as AssignmentsFile;
      if (file.lastUpdated && (!lastUpdated || file.lastUpdated > lastUpdated)) {
        lastUpdated = file.lastUpdated;
      }
      if (file.note) {
        leagueNotes.push({
          leagueId,
          leagueShortLabel: LEAGUES[leagueId].shortLabel,
          note: file.note,
          slateDate: file.nextSlateDate ?? file.date,
        });
      }

      const seenIds = new Set<string>();
      for (const game of file.games) {
        if (seenIds.has(game.id)) continue;
        seenIds.add(game.id);
        if (game.crew.length > 0) {
          pushEntry(games, leagueId, file, game, "live");
        } else {
          pushEntry(games, leagueId, file, game, "scheduled");
        }
      }
      for (const game of file.scheduledGames ?? []) {
        if (seenIds.has(game.id)) continue;
        seenIds.add(game.id);
        pushEntry(games, leagueId, file, game, "scheduled");
      }
    } catch {
      /* skip malformed assignments */
    }
  }

  const order = new Map<LeagueId, number>(
    activeLiveLeagueIds().map((id, index) => [id, index]),
  );
  games.sort(
    (a, b) =>
      (a.status === "live" ? 0 : 1) - (b.status === "live" ? 0 : 1) ||
      (order.get(a.leagueId) ?? 0) - (order.get(b.leagueId) ?? 0) ||
      a.matchup.localeCompare(b.matchup),
  );

  const liveGames = games.filter((game) => game.status === "live");
  const scheduledGames = games.filter((game) => game.status === "scheduled");

  return {
    inSeason: games.length > 0,
    hasLiveCrews: liveGames.length > 0,
    totalGames: liveGames.length,
    totalScheduled: scheduledGames.length,
    lastUpdated,
    games: games.slice(0, 12),
    leagueNotes,
  };
}

import * as fs from "node:fs";
import * as path from "node:path";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import { leagueHubHref, LEAGUES, type LeagueId } from "@/lib/leagues";
import { buildOverviewMatchupInsight } from "@/lib/overview-matchup-insight";
import type { AssignmentsFile } from "@/lib/types";

export type {
  OverviewLeagueNote,
  OverviewLeagueSlateGroup,
  OverviewSlateEntry,
  OverviewSlateStatus,
  OverviewUpcomingSlate,
} from "@/lib/overview-slate-shared";

export {
  formatLeagueSlateCounts,
  groupOverviewSlateByLeague,
} from "@/lib/overview-slate-shared";

import {
  groupOverviewSlateByLeague,
  type OverviewSlateEntry,
  type OverviewLeagueNote,
  type OverviewUpcomingSlate,
  type OverviewSlateStatus,
} from "@/lib/overview-slate-shared";

function leagueSortOrder(): Map<LeagueId, number> {
  return new Map<LeagueId, number>(
    activeLiveLeagueIds().map((id, index) => [id, index]),
  );
}

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

  const order = leagueSortOrder();
  games.sort(
    (a, b) =>
      (a.status === "live" ? 0 : 1) - (b.status === "live" ? 0 : 1) ||
      (order.get(a.leagueId) ?? 0) - (order.get(b.leagueId) ?? 0) ||
      a.matchup.localeCompare(b.matchup),
  );

  const liveGames = games.filter((game) => game.status === "live");
  const scheduledGames = games.filter((game) => game.status === "scheduled");
  const leagueGroups = groupOverviewSlateByLeague(games);

  return {
    inSeason: games.length > 0,
    hasLiveCrews: liveGames.length > 0,
    totalGames: liveGames.length,
    totalScheduled: scheduledGames.length,
    lastUpdated,
    games,
    leagueGroups,
    leagueNotes,
  };
}

import * as fs from "node:fs";
import * as path from "node:path";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import { leagueHubHref, LEAGUES, type LeagueId } from "@/lib/leagues";
import { buildSeasonStageNote, resolveAssignmentSeasonStage } from "@/lib/assignment-season-stage";
import {
  buildOverviewLastMeetingLine,
  buildOverviewMatchupInsight,
  buildOverviewRecentGameContextLine,
  buildOverviewTeamRecentContextLine,
} from "@/lib/overview-matchup-insight";
import type { AssignmentsFile, RefOfficial } from "@/lib/types";

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
  type OverviewLeagueSlateGroup,
  type OverviewSlateEntry,
  type OverviewLeagueNote,
  type OverviewUpcomingSlate,
  type OverviewSlateStatus,
} from "@/lib/overview-slate-shared";

export type LeagueUpcomingSlate = {
  inSeason: boolean;
  leagueGroup: OverviewLeagueSlateGroup | null;
  leagueNote: OverviewLeagueNote | null;
  lastUpdated: string | null;
};

function collectLeagueSlateEntries(
  leagueId: LeagueId,
  file: AssignmentsFile,
): OverviewSlateEntry[] {
  const games: OverviewSlateEntry[] = [];
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

  return games;
}

/** Build upcoming slate rows for a single league hub from assignments data. */
export function buildLeagueUpcomingSlateFromAssignments(
  leagueId: LeagueId,
  file: AssignmentsFile,
  limit?: number,
): LeagueUpcomingSlate {
  const games = collectLeagueSlateEntries(leagueId, file);
  const limited = limit ? games.slice(0, limit) : games;
  const groups = groupOverviewSlateByLeague(limited);
  const leagueNote = file.note
    ? {
        leagueId,
        leagueShortLabel: LEAGUES[leagueId].shortLabel,
        note: file.note,
        slateDate: file.nextSlateDate ?? file.date,
      }
    : null;

  return {
    inSeason: limited.length > 0,
    leagueGroup: groups.find((group) => group.leagueId === leagueId) ?? groups[0] ?? null,
    leagueNote,
    lastUpdated: file.lastUpdated ?? null,
  };
}

/** Read assignments from disk and build a single-league upcoming slate. */
export function buildLeagueUpcomingSlate(leagueId: LeagueId): LeagueUpcomingSlate {
  const filePath = assignmentsPath(leagueId);
  if (!fs.existsSync(filePath)) {
    return {
      inSeason: false,
      leagueGroup: null,
      leagueNote: null,
      lastUpdated: null,
    };
  }

  try {
    const file = JSON.parse(fs.readFileSync(filePath, "utf8")) as AssignmentsFile;
    return buildLeagueUpcomingSlateFromAssignments(leagueId, file);
  } catch {
    return {
      inSeason: false,
      leagueGroup: null,
      leagueNote: null,
      lastUpdated: null,
    };
  }
}

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

function buildOverviewOfficialsLine(
  leagueId: LeagueId,
  crew: RefOfficial[],
  status: OverviewSlateStatus,
): string {
  const soccerLeague = leagueId === "epl" || leagueId === "laliga";
  if (crew.length === 0) {
    return soccerLeague ? "Officials TBD" : "Crews TBD";
  }

  const headRef =
    crew.find((official) => official.role === "referee")?.name ?? crew[0]?.name;
  if (soccerLeague) {
    return headRef ? `Referee: ${headRef}` : "Officials assigned";
  }

  if (status === "scheduled") {
    return "Crews TBD";
  }

  if (headRef) {
    return crew.length > 1
      ? `Head ref ${headRef} · ${crew.length}-person crew`
      : `Head ref ${headRef}`;
  }

  return `${crew.length}-person crew`;
}

function pushEntry(
  games: OverviewSlateEntry[],
  leagueId: LeagueId,
  file: AssignmentsFile,
  game: AssignmentsFile["games"][number],
  status: OverviewSlateStatus,
  slateDateOverride?: string,
): void {
  const league = LEAGUES[leagueId];
  const slateDate = slateDateOverride ?? game.slateDate ?? file.date;
  const headRef =
    game.crew.find((o) => o.role === "referee")?.name ?? game.crew[0]?.name;
  const teamContextLine = buildOverviewTeamRecentContextLine(
    leagueId,
    game.awayTeam,
    game.homeTeam,
  );
  const lastMeetingLine = buildOverviewLastMeetingLine(leagueId, game.awayTeam, game.homeTeam);
  const gameContextLine = buildOverviewRecentGameContextLine(
    leagueId,
    game.awayTeam,
    game.homeTeam,
  );
  const seasonStageNote = buildSeasonStageNote(leagueId, game, slateDate);
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
    slateDate,
    matchupInsight: buildOverviewMatchupInsight(leagueId, game.awayTeam, game.homeTeam),
    lastMeetingLine,
    gameContextLine,
    teamContextLine,
    officialsLine: buildOverviewOfficialsLine(leagueId, game.crew, status),
    seasonStageNote,
  });
}

const HUB_PRESEASON_STAGES: Partial<
  Record<LeagueId, Array<NonNullable<ReturnType<typeof resolveAssignmentSeasonStage>>>>
> = {
  nfl: ["preseason"],
  epl: ["preseason", "exhibition"],
};

function isHubPreseasonMatch(
  leagueId: LeagueId,
  game: AssignmentsFile["games"][number],
  slateDate: string,
): boolean {
  const allowed = HUB_PRESEASON_STAGES[leagueId];
  if (!allowed) return true;
  const stage = resolveAssignmentSeasonStage(leagueId, game, slateDate);
  return stage !== undefined && allowed.includes(stage);
}

/**
 * Build up to `limit` upcoming scheduled games for a league hub.
 * NFL/EPL hubs prefer pre-season or exhibition matchups when present.
 */
export function buildLeagueHubUpcomingSchedule(
  leagueId: LeagueId,
  file: AssignmentsFile,
  limit = 10,
): LeagueUpcomingSlate {
  const entries: OverviewSlateEntry[] = [];
  const seenIds = new Set<string>();

  const consider = (
    game: AssignmentsFile["games"][number],
    status: OverviewSlateStatus,
  ) => {
    if (seenIds.has(game.id)) return;
    const slateDate = game.slateDate ?? file.date;
    if (!isHubPreseasonMatch(leagueId, game, slateDate)) return;
    seenIds.add(game.id);
    pushEntry(entries, leagueId, file, game, status, slateDate);
  };

  for (const game of file.games) {
    consider(game, game.crew.length > 0 ? "live" : "scheduled");
  }
  for (const game of file.scheduledGames ?? []) {
    consider(game, "scheduled");
  }

  if (entries.length === 0 && HUB_PRESEASON_STAGES[leagueId]) {
    return buildLeagueUpcomingSlateFromAssignments(leagueId, file, limit);
  }

  entries.sort(
    (a, b) =>
      (a.slateDate ?? "").localeCompare(b.slateDate ?? "") ||
      a.matchup.localeCompare(b.matchup),
  );

  const limited = entries.slice(0, limit);
  const groups = groupOverviewSlateByLeague(limited);
  const leagueNote = file.note
    ? {
        leagueId,
        leagueShortLabel: LEAGUES[leagueId].shortLabel,
        note: file.note,
        slateDate: file.nextSlateDate ?? file.date,
      }
    : null;

  return {
    inSeason: limited.length > 0,
    leagueGroup: groups.find((group) => group.leagueId === leagueId) ?? groups[0] ?? null,
    leagueNote,
    lastUpdated: file.lastUpdated ?? null,
  };
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
      const leagueSlate = buildLeagueUpcomingSlateFromAssignments(leagueId, file);
      if (leagueSlate.leagueNote) {
        leagueNotes.push(leagueSlate.leagueNote);
      }
      games.push(...(leagueSlate.leagueGroup?.games ?? []));
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

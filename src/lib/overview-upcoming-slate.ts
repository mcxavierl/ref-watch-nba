import * as fs from "node:fs";
import * as path from "node:path";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import { leagueHubHref, LEAGUES, type LeagueId } from "@/lib/leagues";
import { buildSeasonStageNote, resolveAssignmentSeasonStage } from "@/lib/assignment-season-stage";
import { computeLeverageIndex } from "@/lib/leverage-index";
import {
  buildOverviewLastMeetingLine,
  buildOverviewMatchupInsight,
  buildOverviewRecentGameContextLine,
  buildOverviewTeamRecentContextLine,
} from "@/lib/overview-matchup-insight";
import type { AssignmentsFile, GameOddsLine, OddsFile, RefOfficial } from "@/lib/types";

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
  const odds = loadOddsForLeague(leagueId);

  for (const game of file.games) {
    if (seenIds.has(game.id)) continue;
    seenIds.add(game.id);
    if (game.crew.length > 0) {
      pushEntry(games, leagueId, file, game, "live", odds);
    } else {
      pushEntry(games, leagueId, file, game, "scheduled", odds);
    }
  }
  for (const game of file.scheduledGames ?? []) {
    if (seenIds.has(game.id)) continue;
    seenIds.add(game.id);
    pushEntry(games, leagueId, file, game, "scheduled", odds);
  }

  return games;
}

/** Build upcoming slate rows for a single league hub from assignments data. */
export function buildLeagueUpcomingSlateFromAssignments(
  leagueId: LeagueId,
  file: AssignmentsFile,
): LeagueUpcomingSlate {
  const games = collectLeagueSlateEntries(leagueId, file);
  const groups = groupOverviewSlateByLeague(games);
  const leagueNote = file.note
    ? {
        leagueId,
        leagueShortLabel: LEAGUES[leagueId].shortLabel,
        note: file.note,
        slateDate: file.nextSlateDate ?? file.date,
      }
    : null;

  return {
    inSeason: games.length > 0,
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

const LEAGUE_ODDS_PATHS: Partial<Record<LeagueId, string[]>> = {
  nba: ["data/odds.json"],
  nhl: ["data/nhl/odds.json", "data/odds.json"],
  nfl: ["data/nfl/odds.json", "data/nfl/game-lines.json"],
  epl: ["data/epl/odds.json"],
  laliga: ["data/laliga/odds.json"],
  cbb: ["data/cbb/odds.json"],
  cfb: ["data/cfb/odds.json"],
};

function readOddsShard(relativePath: string): OddsFile | null {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
    const parsed = JSON.parse(raw) as OddsFile;
    if (!parsed.lines?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function loadOddsForLeague(leagueId: LeagueId): OddsFile | null {
  const candidates = LEAGUE_ODDS_PATHS[leagueId] ?? [];
  for (const candidate of candidates) {
    const shard = readOddsShard(candidate);
    if (shard) return shard;
  }
  return null;
}

function normalizeTeam(value: string): string {
  return value.trim().toUpperCase();
}

function findOddsLineForGame(
  odds: OddsFile | null,
  game: AssignmentsFile["games"][number],
): GameOddsLine | undefined {
  if (!odds) return undefined;
  const byId = odds.lines.find((line) => line.gameId && line.gameId === game.id);
  if (byId) return byId;

  const away = normalizeTeam(game.awayTeam);
  const home = normalizeTeam(game.homeTeam);
  return odds.lines.find(
    (line) =>
      normalizeTeam(line.awayTeam) === away && normalizeTeam(line.homeTeam) === home,
  );
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
  odds: OddsFile | null,
): void {
  const league = LEAGUES[leagueId];
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
  const seasonStageNote = buildSeasonStageNote(leagueId, game, file.date);
  const seasonStage = resolveAssignmentSeasonStage(leagueId, game, file.date);
  const oddsLine = findOddsLineForGame(odds, game);
  const leverage = computeLeverageIndex({
    leagueId,
    game,
    slateDate: file.date,
    oddsLine,
    seasonStage,
  });

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
    lastMeetingLine,
    gameContextLine,
    teamContextLine,
    officialsLine: buildOverviewOfficialsLine(leagueId, game.crew, status),
    seasonStageNote,
    leverageIndex: leverage.index,
    leverageBreakdown: leverage.breakdownTooltip,
    isMarquee: leverage.isMarquee,
    bettingSplit: leverage.bettingSplit,
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

import { loadRuntimeGameLogs } from "@/lib/game-logs";
import { getCachedGameLogs, type DataLeague, type RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import { graphCacheKey, withGraphCache } from "@/lib/graph/cache";
import {
  getCachedLeagueKnowledgeGraph,
  graphCacheVersion,
  type RefWatchKnowledgeGraph,
} from "@/lib/graph/index";
import { parseVenueId } from "@/lib/graph/schema";
import type { LeagueId } from "@/lib/leagues";
import { PRO_MATRIX_ANALYTICS_LEAGUE_IDS } from "@/lib/league-verification";
import { releaseParsedPayload } from "@/lib/worker-isolate-store";

const LEAGUE_TO_DATA: Record<(typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number], DataLeague> = {
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  epl: "EPL",
  laliga: "LALIGA",
  wnba: "WNBA",
};

export interface CrewTeamImpactResult {
  crewId: string;
  teamId: string;
  gamesSample: number;
  teamWinRate: number;
  avgTotalPoints: number;
  avgFoulsCalled: number;
  foulDeltaVsLeague: number;
  totalPointsDeltaVsLeague: number;
}

export interface PaceMatrixResult {
  officialId: string;
  venueId: string;
  restDays: number;
  gamesSample: number;
  avgTotalPoints: number;
  avgFoulsCalled: number;
  paceDeltaVsOfficial: number;
  foulDeltaVsOfficial: number;
}

export interface OfficialFrictionResult {
  officialIdA: string;
  officialIdB: string;
  sharedGames: number;
  avgFoulsCalled: number;
  foulVariance: number;
  technicalVariance: number;
  avgTechnicalStoppages: number;
}

export interface GraphQueryContext {
  leagueId: LeagueId;
  gameLogs?: RuntimeGameLogEntry[] | null;
  lastUpdated?: string;
}

function resolveGraphContext(
  context: GraphQueryContext,
): { graph: RefWatchKnowledgeGraph; version: string; games: RuntimeGameLogEntry[] } | null {
  if (!(PRO_MATRIX_ANALYTICS_LEAGUE_IDS as readonly LeagueId[]).includes(context.leagueId)) {
    return null;
  }

  const dataLeague = LEAGUE_TO_DATA[context.leagueId as (typeof PRO_MATRIX_ANALYTICS_LEAGUE_IDS)[number]];
  const games =
    context.gameLogs ??
    loadRuntimeGameLogs(dataLeague)?.games ??
    getCachedGameLogs(dataLeague)?.games ??
    null;
  const lastUpdated =
    context.lastUpdated ?? getCachedGameLogs(dataLeague)?.lastUpdated ?? "unknown";

  if (!games?.length) {
    releaseParsedPayload(games);
    return null;
  }

  const graph = getCachedLeagueKnowledgeGraph(dataLeague, games, lastUpdated);
  return { graph, version: graphCacheVersion(graph), games };
}

function daysBetween(previousDate: string, nextDate: string): number {
  const prev = Date.parse(`${previousDate}T12:00:00Z`);
  const next = Date.parse(`${nextDate}T12:00:00Z`);
  if (!Number.isFinite(prev) || !Number.isFinite(next)) return -1;
  return Math.round((next - prev) / (24 * 60 * 60 * 1000));
}

function computeRestDaysForGame(
  graph: RefWatchKnowledgeGraph,
  officialId: string,
  gameDate: string,
): number | null {
  const dates = graph.officialGameDates.get(officialId);
  if (!dates?.length) return null;

  const index = dates.indexOf(gameDate);
  if (index <= 0) return null;

  return daysBetween(dates[index - 1], gameDate);
}

function technicalStoppages(game: RuntimeGameLogEntry | undefined): number {
  if (!game?.crewStoppages?.length) return 0;
  return game.crewStoppages.filter((event) => event.kind === "technical").length;
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squared = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  return squared / values.length;
}

function teamWonInGame(game: RuntimeGameLogEntry, teamId: string): boolean {
  const abbr = teamId.toUpperCase();
  if (game.homeTeam.toUpperCase() === abbr) {
    return game.homeScore > game.awayScore;
  }
  if (game.awayTeam.toUpperCase() === abbr) {
    return game.awayScore > game.homeScore;
  }
  return false;
}

function computeCrewTeamImpact(
  graph: RefWatchKnowledgeGraph,
  crewId: string,
  teamId: string,
  rawGamesById: Map<string, RuntimeGameLogEntry>,
): CrewTeamImpactResult | null {
  const normalizedTeam = teamId.toUpperCase();
  const crewGames = graph.crewToGames.get(crewId);
  if (!crewGames?.length) return null;

  const allGames = [...graph.games.values()];
  const leaguePointAvg =
    allGames.reduce((sum, game) => sum + game.totalPoints, 0) / Math.max(allGames.length, 1);
  const leagueFoulAvg =
    allGames.reduce((sum, game) => sum + game.totalFouls, 0) / Math.max(allGames.length, 1);

  let gamesSample = 0;
  let wins = 0;
  let pointSum = 0;
  let foulSum = 0;

  for (const { gameId } of crewGames) {
    const featured = graph.gameToTeams.get(gameId);
    if (!featured?.some((entry) => entry.teamId === normalizedTeam)) continue;

    const rawGame = rawGamesById.get(gameId);
    const gameNode = graph.games.get(gameId);
    if (!rawGame || !gameNode) continue;

    gamesSample += 1;
    pointSum += gameNode.totalPoints;
    foulSum += gameNode.totalFouls;
    wins += teamWonInGame(rawGame, normalizedTeam) ? 1 : 0;
  }

  if (gamesSample === 0) return null;

  const avgTotalPoints = pointSum / gamesSample;
  const avgFoulsCalled = foulSum / gamesSample;

  return {
    crewId,
    teamId: normalizedTeam,
    gamesSample,
    teamWinRate: wins / gamesSample,
    avgTotalPoints,
    avgFoulsCalled,
    foulDeltaVsLeague: avgFoulsCalled - leagueFoulAvg,
    totalPointsDeltaVsLeague: avgTotalPoints - leaguePointAvg,
  };
}

function computePaceMatrix(
  graph: RefWatchKnowledgeGraph,
  officialId: string,
  venueId: string,
  restDays: number,
): PaceMatrixResult | null {
  if (!parseVenueId(venueId)) return null;

  const crewLinks = graph.officialToCrews.get(officialId);
  if (!crewLinks?.length) return null;

  let officialGames = 0;
  let officialPointSum = 0;
  let officialFoulSum = 0;

  for (const { crewId } of crewLinks) {
    for (const { edge } of graph.crewToGames.get(crewId) ?? []) {
      officialGames += 1;
      officialPointSum += edge.totalPoints;
      officialFoulSum += edge.foulsCalled;
    }
  }

  const officialPointAvg = officialGames > 0 ? officialPointSum / officialGames : 0;
  const officialFoulAvg = officialGames > 0 ? officialFoulSum / officialGames : 0;

  let sample = 0;
  let pointSum = 0;
  let foulSum = 0;

  for (const { crewId } of crewLinks) {
    for (const { gameId, edge } of graph.crewToGames.get(crewId) ?? []) {
      const gameNode = graph.games.get(gameId);
      if (!gameNode || gameNode.venueId !== venueId) continue;

      const rest = computeRestDaysForGame(graph, officialId, gameNode.date);
      if (rest === null || rest !== restDays) continue;

      sample += 1;
      pointSum += edge.totalPoints;
      foulSum += edge.foulsCalled;
    }
  }

  if (sample === 0) return null;

  const avgTotalPoints = pointSum / sample;
  const avgFoulsCalled = foulSum / sample;

  return {
    officialId,
    venueId,
    restDays,
    gamesSample: sample,
    avgTotalPoints,
    avgFoulsCalled,
    paceDeltaVsOfficial: avgTotalPoints - officialPointAvg,
    foulDeltaVsOfficial: avgFoulsCalled - officialFoulAvg,
  };
}

function computeOfficialFriction(
  graph: RefWatchKnowledgeGraph,
  officialIdA: string,
  officialIdB: string,
  rawGamesById: Map<string, RuntimeGameLogEntry>,
): OfficialFrictionResult | null {
  const crewsA = new Set((graph.officialToCrews.get(officialIdA) ?? []).map((entry) => entry.crewId));
  const crewsB = new Set((graph.officialToCrews.get(officialIdB) ?? []).map((entry) => entry.crewId));

  const sharedCrewIds = [...crewsA].filter((crewId) => crewsB.has(crewId));
  if (sharedCrewIds.length === 0) {
    return {
      officialIdA,
      officialIdB,
      sharedGames: 0,
      avgFoulsCalled: 0,
      foulVariance: 0,
      technicalVariance: 0,
      avgTechnicalStoppages: 0,
    };
  }

  const fouls: number[] = [];
  const technicals: number[] = [];
  const seenGameIds = new Set<string>();

  for (const crewId of sharedCrewIds) {
    for (const { gameId, edge } of graph.crewToGames.get(crewId) ?? []) {
      if (seenGameIds.has(gameId)) continue;
      seenGameIds.add(gameId);
      fouls.push(edge.foulsCalled);
      technicals.push(technicalStoppages(rawGamesById.get(gameId)));
    }
  }

  if (fouls.length === 0) {
    return {
      officialIdA,
      officialIdB,
      sharedGames: 0,
      avgFoulsCalled: 0,
      foulVariance: 0,
      technicalVariance: 0,
      avgTechnicalStoppages: 0,
    };
  }

  const avgFoulsCalled = fouls.reduce((sum, value) => sum + value, 0) / fouls.length;
  const avgTechnicalStoppages =
    technicals.reduce((sum, value) => sum + value, 0) / technicals.length;

  return {
    officialIdA,
    officialIdB,
    sharedGames: fouls.length,
    avgFoulsCalled,
    foulVariance: variance(fouls),
    technicalVariance: variance(technicals),
    avgTechnicalStoppages,
  };
}

function rawGamesMap(games: RuntimeGameLogEntry[]): Map<string, RuntimeGameLogEntry> {
  return new Map(games.map((game) => [game.gameId, game]));
}

export function queryCrewTeamImpact(
  crewId: string,
  teamId: string,
  context: GraphQueryContext,
): CrewTeamImpactResult | null {
  const resolved = resolveGraphContext(context);
  if (!resolved) return null;

  const cacheKey = graphCacheKey([
    "graph",
    "v1",
    "crew-team-impact",
    context.leagueId,
    resolved.version,
    crewId,
    teamId.toUpperCase(),
  ]);

  return withGraphCache(cacheKey, () =>
    computeCrewTeamImpact(
      resolved.graph,
      crewId,
      teamId.toUpperCase(),
      rawGamesMap(resolved.games),
    ),
  );
}

export function queryPaceMatrix(
  officialId: string,
  venueId: string,
  restDays: number,
  context: GraphQueryContext,
): PaceMatrixResult | null {
  const resolved = resolveGraphContext(context);
  if (!resolved) return null;

  const cacheKey = graphCacheKey([
    "graph",
    "v1",
    "pace-matrix",
    context.leagueId,
    resolved.version,
    officialId,
    venueId,
    String(restDays),
  ]);

  return withGraphCache(cacheKey, () =>
    computePaceMatrix(resolved.graph, officialId, venueId, restDays),
  );
}

export function queryOfficialFriction(
  officialIdA: string,
  officialIdB: string,
  context: GraphQueryContext,
): OfficialFrictionResult | null {
  const resolved = resolveGraphContext(context);
  if (!resolved) return null;

  const cacheKey = graphCacheKey([
    "graph",
    "v1",
    "official-friction",
    context.leagueId,
    resolved.version,
    officialIdA,
    officialIdB,
  ]);

  return withGraphCache(cacheKey, () =>
    computeOfficialFriction(
      resolved.graph,
      officialIdA,
      officialIdB,
      rawGamesMap(resolved.games),
    ),
  );
}

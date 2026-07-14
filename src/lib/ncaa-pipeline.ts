import { getTeam as getCbbTeam } from "@/lib/cbb/teams";
import { isCbbSimulatedData, isCbbVerifiedData } from "@/lib/cbb/data-source";
import { getTeam as getCfbTeam } from "@/lib/cfb/teams";
import { isCfbSimulatedData, isCfbVerifiedData } from "@/lib/cfb/data-source";
import { getCachedGameLogs } from "@/lib/game-logs-preload";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import { getCachedRefStats } from "@/lib/ref-stats-preload";
import type { LeagueId } from "@/lib/leagues";
import type { RefOfficial, RefProfile, RefStatsFile, RefTeamStat } from "@/lib/types";

export type NcaaRouteLeague = "cbb" | "cfb";
export type NcaaSportLeague = "CBB" | "CFB";

export type NcaaConferenceTerritory =
  | "ACC"
  | "Big Ten"
  | "Big 12"
  | "SEC"
  | "Big East"
  | "Pac-12"
  | "Other";

export interface NcaaConferenceCrewAssignment {
  gameId: string;
  date: string;
  season: string;
  territoryBucket: NcaaConferenceTerritory;
  homeTeam: string;
  awayTeam: string;
  homeConference: NcaaConferenceTerritory | null;
  awayConference: NcaaConferenceTerritory | null;
  crewKey: string;
  officials: RefOfficial[];
}

export interface NcaaConferenceCrewRollup {
  crewKey: string;
  crewNames: string[];
  games: number;
  seasons: string[];
  teams: string[];
}

export interface NcaaConferenceTerritoryBucket {
  conference: NcaaConferenceTerritory;
  assignments: NcaaConferenceCrewAssignment[];
  crews: NcaaConferenceCrewRollup[];
  gameCount: number;
}

export interface NcaaConferenceCrewIndex {
  league: NcaaSportLeague;
  territories: Record<NcaaConferenceTerritory, NcaaConferenceTerritoryBucket>;
  totalMappedGames: number;
  unmappedGames: number;
}

export interface NcaaIntegrityFailure {
  scope: "game" | "ref" | "crew";
  id: string;
  reasons: string[];
}

export interface NcaaPipelineVerificationResult {
  league: NcaaRouteLeague;
  verified: boolean;
  coveragePct: number;
  totalGames: number;
  verifiedGames: number;
  totalRefs: number;
  verifiedRefs: number;
  failures: NcaaIntegrityFailure[];
}

const ROUTE_TO_SPORT: Record<NcaaRouteLeague, NcaaSportLeague> = {
  cbb: "CBB",
  cfb: "CFB",
};

const NCAA_CONFERENCES: NcaaConferenceTerritory[] = [
  "ACC",
  "Big Ten",
  "Big 12",
  "SEC",
  "Big East",
  "Pac-12",
  "Other",
];

function emptyTerritoryBucket(
  conference: NcaaConferenceTerritory,
): NcaaConferenceTerritoryBucket {
  return {
    conference,
    assignments: [],
    crews: [],
    gameCount: 0,
  };
}

function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

export function crewKeyFromOfficials(
  officials: Pick<RefOfficial, "name" | "number">[],
): string {
  return officials
    .map((official) => refSlug(official.name, official.number))
    .sort()
    .join("|");
}

function resolveTeamConference(
  league: NcaaRouteLeague,
  teamAbbr: string,
): NcaaConferenceTerritory | null {
  const lookup = league === "cbb" ? getCbbTeam : getCfbTeam;
  const team = lookup(teamAbbr.toUpperCase());
  return team?.conference ?? null;
}

/** Assign a game to a conference territory bucket (home conference primary). */
export function resolveGameConferenceTerritory(
  league: NcaaRouteLeague,
  homeTeam: string,
  awayTeam: string,
): NcaaConferenceTerritory {
  const homeConference = resolveTeamConference(league, homeTeam);
  const awayConference = resolveTeamConference(league, awayTeam);
  if (homeConference) return homeConference;
  if (awayConference) return awayConference;
  return "Other";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function verifyCrewList(
  officials: RefOfficial[] | undefined,
): { verified: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!officials?.length) {
    reasons.push("crew list empty");
    return { verified: false, reasons };
  }

  for (const [index, official] of officials.entries()) {
    if (!isNonEmptyString(official.name)) {
      reasons.push(`official ${index + 1} missing name`);
    }
    if (typeof official.number !== "number" || Number.isNaN(official.number)) {
      reasons.push(`official ${index + 1} missing number`);
    }
    if (!isNonEmptyString(official.role)) {
      reasons.push(`official ${index + 1} missing role`);
    }
  }

  return { verified: reasons.length === 0, reasons };
}

export function verifyGameLogEntry(
  game: RuntimeGameLogEntry,
): { verified: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!isNonEmptyString(game.gameId)) reasons.push("gameId empty");
  if (!isNonEmptyString(game.date)) reasons.push("date empty");
  if (!isNonEmptyString(game.season)) reasons.push("season empty");
  if (!isNonEmptyString(game.homeTeam)) reasons.push("homeTeam empty");
  if (!isNonEmptyString(game.awayTeam)) reasons.push("awayTeam empty");
  if (typeof game.homeScore !== "number" || Number.isNaN(game.homeScore)) {
    reasons.push("homeScore missing");
  }
  if (typeof game.awayScore !== "number" || Number.isNaN(game.awayScore)) {
    reasons.push("awayScore missing");
  }
  if (typeof game.totalPoints !== "number" || Number.isNaN(game.totalPoints)) {
    reasons.push("totalPoints missing");
  }

  const crew = verifyCrewList(game.officials);
  if (!crew.verified) {
    reasons.push(...crew.reasons.map((reason) => `crew: ${reason}`));
  }

  return { verified: reasons.length === 0, reasons };
}

function teamStatIsComplete(stat: RefTeamStat): boolean {
  if (stat.games <= 0) return false;
  if (typeof stat.avgTotalPoints !== "number" || Number.isNaN(stat.avgTotalPoints)) {
    return false;
  }
  if (typeof stat.overRate !== "number" || Number.isNaN(stat.overRate)) {
    return false;
  }
  if (typeof stat.avgFoulDifferential !== "number" || Number.isNaN(stat.avgFoulDifferential)) {
    return false;
  }
  return true;
}

export function verifyRefTeamMatchHistory(
  ref: RefProfile,
): { verified: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (ref.games <= 0) {
    return { verified: true, reasons };
  }

  const teamEntries = Object.entries(ref.teamStats ?? {});
  if (teamEntries.length === 0) {
    reasons.push("team match history missing");
    return { verified: false, reasons };
  }

  for (const [team, stat] of teamEntries) {
    if (!teamStatIsComplete(stat)) {
      reasons.push(`incomplete team history for ${team}`);
    }
  }

  if (ref.recentGames.length > 0) {
    for (const game of ref.recentGames) {
      if (!isNonEmptyString(game.gameId)) reasons.push("recent game missing gameId");
      if (!isNonEmptyString(game.date)) reasons.push("recent game missing date");
      if (!isNonEmptyString(game.homeTeam)) reasons.push("recent game missing homeTeam");
      if (!isNonEmptyString(game.awayTeam)) reasons.push("recent game missing awayTeam");
      if (typeof game.totalPoints !== "number") {
        reasons.push("recent game missing totalPoints");
      }
      if (typeof game.totalFouls !== "number") {
        reasons.push("recent game missing totalFouls");
      }
    }
  }

  return { verified: reasons.length === 0, reasons };
}

function rollupCrews(
  assignments: NcaaConferenceCrewAssignment[],
): NcaaConferenceCrewRollup[] {
  const byCrew = new Map<string, NcaaConferenceCrewRollup>();

  for (const assignment of assignments) {
    const existing = byCrew.get(assignment.crewKey);
    if (!existing) {
      byCrew.set(assignment.crewKey, {
        crewKey: assignment.crewKey,
        crewNames: assignment.officials.map((official) => official.name),
        games: 1,
        seasons: [assignment.season],
        teams: [assignment.homeTeam, assignment.awayTeam],
      });
      continue;
    }

    existing.games += 1;
    if (!existing.seasons.includes(assignment.season)) {
      existing.seasons.push(assignment.season);
    }
    for (const team of [assignment.homeTeam, assignment.awayTeam]) {
      if (!existing.teams.includes(team)) existing.teams.push(team);
    }
  }

  return [...byCrew.values()].sort((a, b) => b.games - a.games);
}

/** Map game logs into conference territory buckets with crew assignments. */
export function buildNcaaConferenceCrewIndex(
  league: NcaaRouteLeague,
  gameLogs: RuntimeGameLogEntry[],
): NcaaConferenceCrewIndex {
  const territories = Object.fromEntries(
    NCAA_CONFERENCES.map((conference) => [
      conference,
      emptyTerritoryBucket(conference),
    ]),
  ) as Record<NcaaConferenceTerritory, NcaaConferenceTerritoryBucket>;

  let totalMappedGames = 0;
  let unmappedGames = 0;

  for (const game of gameLogs) {
    const gameCheck = verifyGameLogEntry(game);
    if (!gameCheck.verified) {
      unmappedGames += 1;
      continue;
    }

    const homeConference = resolveTeamConference(league, game.homeTeam);
    const awayConference = resolveTeamConference(league, game.awayTeam);
    const territoryBucket = resolveGameConferenceTerritory(
      league,
      game.homeTeam,
      game.awayTeam,
    );

    const assignment: NcaaConferenceCrewAssignment = {
      gameId: game.gameId,
      date: game.date,
      season: game.season,
      territoryBucket,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeConference,
      awayConference,
      crewKey: crewKeyFromOfficials(game.officials),
      officials: game.officials,
    };

    const bucket = territories[territoryBucket];
    bucket.assignments.push(assignment);
    bucket.gameCount += 1;
    totalMappedGames += 1;
  }

  for (const conference of NCAA_CONFERENCES) {
    territories[conference].crews = rollupCrews(territories[conference].assignments);
  }

  return {
    league: ROUTE_TO_SPORT[league],
    territories,
    totalMappedGames,
    unmappedGames,
  };
}

/** Strict integrity gate: 100% coverage requires every game and ref record to pass. */
export function verifyNcaaPipelineIntegrity(
  league: NcaaRouteLeague,
  stats: RefStatsFile | null | undefined,
  gameLogs: RuntimeGameLogEntry[] | null | undefined,
): NcaaPipelineVerificationResult {
  const games = gameLogs ?? [];
  const refs = stats?.refs ?? [];
  const failures: NcaaIntegrityFailure[] = [];

  let verifiedGames = 0;
  for (const game of games) {
    const check = verifyGameLogEntry(game);
    if (check.verified) {
      verifiedGames += 1;
    } else {
      failures.push({
        scope: "game",
        id: game.gameId || "unknown-game",
        reasons: check.reasons,
      });
    }
  }

  let verifiedRefs = 0;
  for (const ref of refs) {
    const check = verifyRefTeamMatchHistory(ref);
    if (check.verified) {
      verifiedRefs += 1;
    } else {
      failures.push({
        scope: "ref",
        id: ref.slug,
        reasons: check.reasons,
      });
    }
  }

  const totalGames = games.length;
  const totalRefs = refs.length;
  const gameCoverage = totalGames > 0 ? (verifiedGames / totalGames) * 100 : 0;
  const refCoverage = totalRefs > 0 ? (verifiedRefs / totalRefs) * 100 : 0;
  const coveragePct =
    totalGames > 0 && totalRefs > 0
      ? Math.min(gameCoverage, refCoverage)
      : 0;

  const verified =
    totalGames > 0 &&
    totalRefs > 0 &&
    verifiedGames === totalGames &&
    verifiedRefs === totalRefs &&
    failures.length === 0;

  return {
    league,
    verified,
    coveragePct: Math.round(coveragePct * 10) / 10,
    totalGames,
    verifiedGames,
    totalRefs,
    verifiedRefs,
    failures,
  };
}

export function isNcaaPipelineFullyVerified(
  result: NcaaPipelineVerificationResult,
): boolean {
  return result.verified && result.coveragePct >= 100;
}

function sourceGatePassed(
  league: NcaaRouteLeague,
  meta: RefStatsFile["meta"],
): boolean {
  const isVerified =
    league === "cbb"
      ? isCbbVerifiedData(meta.source)
      : isCfbVerifiedData(meta.source);
  const isSim =
    league === "cbb"
      ? isCbbSimulatedData(meta.source)
      : isCfbSimulatedData(meta.source);
  return meta.data_verified === true && isVerified && !isSim;
}

/** Frontend activation gate: source verified AND pipeline coverage is 100%. */
export function resolveNcaaDataVerified(
  league: NcaaRouteLeague,
  stats: RefStatsFile | null | undefined,
  gameLogs?: RuntimeGameLogEntry[] | null,
): boolean {
  if (!stats?.refs?.length) return false;
  if (!sourceGatePassed(league, stats.meta)) return false;

  const logs =
    gameLogs ??
    getCachedGameLogs(league === "cbb" ? "CBB" : "CFB")?.games ??
    null;
  if (!logs?.length) return false;

  const pipeline = verifyNcaaPipelineIntegrity(league, stats, logs);
  return isNcaaPipelineFullyVerified(pipeline);
}

export function resolveNcaaDataVerifiedForLeagueId(
  leagueId: LeagueId,
  stats?: RefStatsFile | null,
  gameLogs?: RuntimeGameLogEntry[] | null,
): boolean {
  if (leagueId !== "cbb" && leagueId !== "cfb") return false;
  const resolvedStats =
    stats ?? getCachedRefStats(leagueId) ?? null;
  return resolveNcaaDataVerified(leagueId, resolvedStats, gameLogs);
}

/** Stamp pipeline verification onto stats meta for downstream league gates. */
export function applyNcaaPipelineVerificationMeta(
  league: NcaaRouteLeague,
  stats: RefStatsFile,
  gameLogs: RuntimeGameLogEntry[] | null | undefined,
): RefStatsFile {
  const pipeline = verifyNcaaPipelineIntegrity(league, stats, gameLogs ?? []);
  const dataVerified = sourceGatePassed(league, stats.meta) && isNcaaPipelineFullyVerified(pipeline);

  return {
    ...stats,
    meta: {
      ...stats.meta,
      data_verified: dataVerified,
      ncaa_pipeline_verified: pipeline.verified,
      ncaa_pipeline_coverage_pct: pipeline.coveragePct,
    },
  };
}

export function aggregateNcaaPipeline(
  league: NcaaRouteLeague,
  stats: RefStatsFile | null | undefined,
  gameLogs: RuntimeGameLogEntry[] | null | undefined,
): {
  index: NcaaConferenceCrewIndex;
  verification: NcaaPipelineVerificationResult;
} {
  const games = gameLogs ?? [];
  return {
    index: buildNcaaConferenceCrewIndex(league, games),
    verification: verifyNcaaPipelineIntegrity(league, stats, games),
  };
}

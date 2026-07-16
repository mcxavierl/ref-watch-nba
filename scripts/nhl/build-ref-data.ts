#!/usr/bin/env npx tsx
/**
 * NHL verified ingest: fetch officials, scores, and PIM from NHL API,
 * aggregate ref-stats with DISTINCT game_id dedup, write season NDJSON shards.
 *
 * Usage:
 *   npm run build-nhl-data          - live backfill from NHL API (resumable)
 *   npm run rebuild-nhl-from-logs   - rebuild ref-stats from game-logs.json
 *   npm run validate-nhl-ingest     - hard-fail validation gates
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { crewKey, refSlug } from "../lib/slug";
import { dedupeRefsInPlace } from "../lib/merge-duplicate-refs";
import {
  collectRefTeamStats,
  pushRefTeamGame,
  type RefTeamGameRow,
} from "../lib/ref-team-stats";
import type {
  RefGameRecord,
  RefProfile,
  RefStatsFile,
  RefRole,
  TeamCrewSplit,
} from "../../../src/lib/types";
import { fetchGamePenalties, inferOvertimeFromSchedule } from "./lib/game-log";
import {
  dedupeGameLogs,
  loadGameLogs,
  saveGameLogs,
  toOfficials,
  type GameLogEntry,
} from "../lib/game-logs";
import { buildBaselinesFile, saveBaselines } from "../lib/baselines";
import {
  computeLeagueAvgMinors,
  computeLeagueOvertimeRate,
  computeNhlRefAnalytics,
} from "./lib/ref-analytics";
import {
  homeCoverRate,
  NhlBettingAccumulator,
} from "./lib/nhl-betting";
import { teamWonGame } from "../lib/team-win";
import {
  NHL_TEN_SEASONS,
  nhlSeasonApiId,
} from "../lib/ten-season-policy";
import {
  formatValidationReport,
  validateNhlGameLogs,
} from "./lib/validate-ingest";

const NHL_DATA_DIR = path.join(process.cwd(), "data", "nhl");
const NHL_SHARD_DIR = path.join(NHL_DATA_DIR, "game-logs");

/** Current 32-team roster keys used for teamSplits / routes. */
const NHL_TEAM_ABBRS = [
  "ANA", "BOS", "BUF", "CAR", "CBJ", "CGY", "CHI", "COL", "DAL", "DET",
  "EDM", "FLA", "LAK", "MIN", "MTL", "NSH", "NJD", "NYI", "NYR", "OTT",
  "PHI", "PIT", "SEA", "SJS", "STL", "TBL", "TOR", "UTA", "VAN", "VGK",
  "WPG", "WSH",
];

/**
 * Schedule collection includes historical franchise codes the NHL API still
 * returns (ARI Coyotes → Utah). Games are normalized onto UTA below.
 */
const NHL_SCHEDULE_TEAM_ABBRS = [...NHL_TEAM_ABBRS, "ARI"];

/** Map relocated / renamed franchise codes onto current team keys. */
function normalizeNhlTeamAbbr(abbr: string): string {
  const upper = abbr.toUpperCase();
  if (upper === "ARI" || upper === "PHX") return "UTA";
  return upper;
}

const MIN_SAMPLE = 30;
/** Keep concurrency low — NHL right-rail returns empty crews when overloaded. */
const FETCH_CONCURRENCY = Number.parseInt(
  process.env.NHL_FETCH_CONCURRENCY ?? "2",
  10,
);
/** Refuse to publish a "10-season" file with a one-season-sized sample. */
const MIN_GAMES_FOR_LIVE_BUILD = Number.parseInt(
  process.env.NHL_MIN_GAMES ?? "10000",
  10,
);
/**
 * Seasons below this game count are truncated / in-progress and must not be
 * listed in meta.seasons as full coverage. 850 keeps COVID 2020-21 (~868) while
 * excluding partial 2023-24+ until near a full ~1312-game slate — so we do not
 * claim 8+ seasons and trip check:deploy's incomplete-ingest floor.
 */
const MEANINGFUL_SEASON_MIN_GAMES = Number.parseInt(
  process.env.NHL_MEANINGFUL_SEASON_GAMES ?? "850",
  10,
);

interface NhlOfficialRecord {
  firstName: string;
  lastName: string;
  sweaterNumber: number;
  officialType: string;
}

interface ScheduleGame {
  id: number;
  gameType: number;
  gameState: string;
  awayTeam: { abbrev: string; score?: number };
  homeTeam: { abbrev: string; score?: number };
  periodDescriptor?: { periodType?: string };
}

interface ScheduleDay {
  date: string;
  games: ScheduleGame[];
}

interface ScheduleResponse {
  gameWeek: ScheduleDay[];
}

interface RightRailResponse {
  gameInfo?: {
    referees?: { default: string }[];
    linesmen?: { default: string }[];
  };
}

interface BoxscorePlayer {
  pim?: number;
}

interface BoxscoreResponse {
  homeTeam?: { score?: number };
  awayTeam?: { score?: number };
  playerByGameStats?: Record<
    string,
    {
      forwards?: BoxscorePlayer[];
      defense?: BoxscorePlayer[];
      goalies?: BoxscorePlayer[];
    }
  >;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ClubScheduleGame {
  id: number;
  gameType: number;
  gameState: string;
  gameDate: string;
  awayTeam: { abbrev: string; score?: number };
  homeTeam: { abbrev: string; score?: number };
  periodDescriptor?: { periodType?: string };
}

async function fetchTeamSeasonGames(
  teamAbbr: string,
  season: string,
): Promise<{ gameId: number; date: string; game: ScheduleGame }[]> {
  const apiId = nhlSeasonApiId(season);
  const res = await fetchWithRetry(
    `https://api-web.nhle.com/v1/club-schedule-season/${teamAbbr}/${apiId}`,
  );
  if (!res.ok) return [];
  const body = (await res.json()) as { games?: ClubScheduleGame[] };
  const out: { gameId: number; date: string; game: ScheduleGame }[] = [];
  for (const g of body.games ?? []) {
    if (g.gameType !== 2 || g.gameState !== "OFF") continue;
    out.push({
      gameId: g.id,
      date: g.gameDate.slice(0, 10),
      game: {
        id: g.id,
        gameType: g.gameType,
        gameState: g.gameState,
        awayTeam: g.awayTeam,
        homeTeam: g.homeTeam,
        periodDescriptor: g.periodDescriptor,
      },
    });
  }
  return out;
}

async function collectTenSeasonGames(): Promise<
  Map<number, { date: string; game: ScheduleGame }>
> {
  const seen = new Map<number, { date: string; game: ScheduleGame }>();
  for (const season of NHL_TEN_SEASONS) {
    let seasonNew = 0;
    for (const team of NHL_SCHEDULE_TEAM_ABBRS) {
      const games = await fetchTeamSeasonGames(team, season);
      for (const g of games) {
        if (!seen.has(g.gameId)) {
          seen.set(g.gameId, { date: g.date, game: g.game });
          seasonNew++;
        }
      }
      await sleep(40);
    }
    console.log(
      `  ${season}: +${seasonNew} new games (${seen.size} unique total)`,
    );
  }
  return seen;
}

async function fetchWithRetry(
  url: string,
  retries = 5,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json,text/plain,*/*",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://www.nhl.com/",
          Origin: "https://www.nhl.com",
        },
      });
      if (res.ok) return res;
      // Retry rate limits / transient upstream errors.
      if ([429, 500, 502, 503, 504].includes(res.status)) {
        await sleep(400 * (attempt + 1) + Math.floor(Math.random() * 300));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      await sleep(500 * (attempt + 1));
    }
  }
  throw lastErr ?? new Error(`fetch failed for ${url}`);
}

async function fetchOfficialsMap(): Promise<Map<string, number>> {
  const res = await fetchWithRetry(
    "https://records.nhl.com/site/api/officials?cayenneExp=active=true",
  );
  if (!res.ok) throw new Error(`Officials API ${res.status}`);
  const body = (await res.json()) as { data: NhlOfficialRecord[] };
  const map = new Map<string, number>();
  for (const o of body.data) {
    map.set(normalizeName(`${o.firstName} ${o.lastName}`), o.sweaterNumber);
  }
  return map;
}

function lookupNumber(name: string, officials: Map<string, number>): number {
  const key = normalizeName(name);
  return officials.get(key) ?? 0;
}

async function fetchScheduleDay(date: string): Promise<ScheduleGame[]> {
  const res = await fetchWithRetry(`https://api-web.nhle.com/v1/schedule/${date}`);
  if (!res.ok) return [];
  const body = (await res.json()) as ScheduleResponse;
  const games: ScheduleGame[] = [];
  for (const day of body.gameWeek ?? []) {
    if (day.date !== date) continue;
    for (const game of day.games ?? []) {
      if (game.gameType !== 2 || game.gameState !== "OFF") continue;
      games.push(game);
    }
  }
  return games;
}

async function fetchCrew(
  gameId: number,
  officials: Map<string, number>,
): Promise<{ name: string; number: number; role: RefRole }[]> {
  const res = await fetchWithRetry(
    `https://api-web.nhle.com/v1/gamecenter/${gameId}/right-rail`,
  );
  if (!res.ok) return [];
  const text = await res.text();
  if (!text || text.trimStart().startsWith("<")) return [];
  let body: RightRailResponse;
  try {
    body = JSON.parse(text) as RightRailResponse;
  } catch {
    return [];
  }
  const crew: { name: string; number: number; role: RefRole }[] = [];
  for (const ref of body.gameInfo?.referees ?? []) {
    if (!ref?.default) continue;
    crew.push({
      name: ref.default,
      number: lookupNumber(ref.default, officials),
      role: "referee",
    });
  }
  for (const lines of body.gameInfo?.linesmen ?? []) {
    if (!lines?.default) continue;
    crew.push({
      name: lines.default,
      number: lookupNumber(lines.default, officials),
      role: "linesman",
    });
  }
  return crew;
}

/** NHL often returns HTTP 200 with empty gameInfo when overloaded — retry. */
async function fetchCrewWithRetry(
  gameId: number,
  officials: Map<string, number>,
  attempts = 6,
): Promise<{ name: string; number: number; role: RefRole }[]> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const crew = await fetchCrew(gameId, officials);
    if (crew.length > 0) return crew;
    await sleep(250 * (attempt + 1) + Math.floor(Math.random() * 400));
  }
  return [];
}

function teamPim(box: BoxscoreResponse, side: string): number {
  const stats = box.playerByGameStats?.[side];
  if (!stats) return 0;
  let total = 0;
  for (const group of ["forwards", "defense", "goalies"] as const) {
    for (const p of stats[group] ?? []) {
      total += p.pim ?? 0;
    }
  }
  return total;
}

async function fetchBoxscore(gameId: number): Promise<{
  homeScore: number;
  awayScore: number;
  homePim: number;
  awayPim: number;
} | null> {
  const res = await fetchWithRetry(
    `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`,
  );
  if (!res.ok) return null;
  const box = (await res.json()) as BoxscoreResponse;
  const homeScore = box.homeTeam?.score;
  const awayScore = box.awayTeam?.score;
  if (homeScore === undefined || awayScore === undefined) return null;
  return {
    homeScore,
    awayScore,
    homePim: teamPim(box, "homeTeam"),
    awayPim: teamPim(box, "awayTeam"),
  };
}

function seasonFromDate(date: string): string {
  const year = Number.parseInt(date.slice(0, 4), 10);
  const month = Number.parseInt(date.slice(5, 7), 10);
  if (month >= 10) return `${year}-${String(year + 1).slice(2)}`;
  return `${year - 1}-${String(year).slice(2)}`;
}

interface BuildMaps {
  refGames: Map<string, RefGameRecord[]>;
  refMinorGames: Map<string, RefGameRecord[]>;
  refMeta: Map<string, { name: string; number: number; role: RefRole }>;
  refTeamBuckets: Map<string, Map<string, RefTeamGameRow[]>>;
  refBetting: Map<string, NhlBettingAccumulator>;
  teamByCrew: Map<string, Map<string, TeamCrewBucket>>;
  exportedGameLogs: GameLogEntry[];
  allDates: string[];
  linedGames: number;
}

function absorbGame(
  maps: BuildMaps,
  input: {
    gameId: string;
    date: string;
    season: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    totalPim: number;
    homePim: number;
    awayPim: number;
    homeMinors: number;
    awayMinors: number;
    wentToOvertime: boolean;
    closingTotal: number;
    homeSpread: number;
    crew: { name: string; number: number; role: RefRole }[];
    lineSource: GameLogEntry["lineSource"];
  },
): void {
  const {
    gameId,
    date,
    season,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    totalPim,
    homePim,
    awayPim,
    homeMinors,
    awayMinors,
    wentToOvertime,
    closingTotal,
    homeSpread,
    crew,
    lineSource,
  } = input;

  const totalPoints = homeScore + awayScore;
  const overHit = totalPoints > closingTotal;
  maps.allDates.push(date);
  if (lineSource === "synthetic" || lineSource === "external") {
    maps.linedGames++;
  }

  const record: RefGameRecord = {
    gameId,
    date,
    season,
    homeTeam,
    awayTeam,
    totalPoints,
    totalFouls: totalPim,
    overHit,
    raptorsInvolved: false,
    homeMinors,
    awayMinors,
    wentToOvertime,
    closingTotal,
    homeSpread,
  };

  maps.exportedGameLogs.push({
    gameId,
    date,
    season,
    league: "NHL",
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    totalPoints,
    totalFouls: totalPim,
    homeMinors,
    awayMinors,
    wentToOvertime,
    closingTotal,
    homeSpread,
    lineSource,
    officials: toOfficials(crew),
  });

  const key = crewKey(crew);
  const crewNames = crew.map((o) => o.name);

  const makeRow = (teamAbbr: string): TeamGameRow | null => {
    const isHome = homeTeam === teamAbbr;
    const isAway = awayTeam === teamAbbr;
    if (!isHome && !isAway) return null;
    const teamWin = teamWonGame(
      homeScore,
      awayScore,
      homeTeam,
      awayTeam,
      teamAbbr,
    );
    return {
      totalPoints,
      totalFouls: totalPim,
      overHit,
      teamFouls: isHome ? homePim : awayPim,
      opponentFouls: isHome ? awayPim : homePim,
      teamWin,
      isHome,
    };
  };

  for (const teamAbbr of [homeTeam, awayTeam]) {
    const row = makeRow(teamAbbr);
    if (!row) continue;
    const buckets = maps.teamByCrew.get(teamAbbr)!;
    const existing = buckets.get(key) ?? { crewNames, games: [] };
    existing.games.push(row);
    buckets.set(key, existing);
  }

  for (const official of crew) {
    const slug = refSlug(official.name, official.number);
    maps.refMeta.set(slug, official);
    const games = maps.refGames.get(slug) ?? [];
    games.push(record);
    maps.refGames.set(slug, games);

    if (official.role === "referee") {
      const minorGames = maps.refMinorGames.get(slug) ?? [];
      minorGames.push(record);
      maps.refMinorGames.set(slug, minorGames);
    }

    if (lineSource === "synthetic" || lineSource === "external") {
      const acc = maps.refBetting.get(slug) ?? new NhlBettingAccumulator(true);
      acc.addGame({
        homeScore,
        awayScore,
        homeSpread,
        total: closingTotal,
      });
      maps.refBetting.set(slug, acc);
    }

    for (const teamAbbr of [homeTeam, awayTeam]) {
      const row = makeRow(teamAbbr);
      if (!row) continue;
      pushRefTeamGame(maps.refTeamBuckets, slug, teamAbbr, {
        foulDifferential: row.teamFouls - row.opponentFouls,
        totalPoints: row.totalPoints,
        overHit: row.overHit,
        teamWin: row.teamWin,
      });
    }
  }
}

function replayGameLogs(logs: GameLogEntry[], maps: BuildMaps): void {
  for (const game of logs) {
    if (game.league !== "NHL") continue;
    const homeTeam = normalizeNhlTeamAbbr(game.homeTeam);
    const awayTeam = normalizeNhlTeamAbbr(game.awayTeam);
    if (!NHL_TEAM_ABBRS.includes(homeTeam) || !NHL_TEAM_ABBRS.includes(awayTeam)) {
      continue;
    }
    const homePim = game.homeMinors ? game.homeMinors * 2 : game.totalFouls / 2;
    const awayPim = game.awayMinors ? game.awayMinors * 2 : game.totalFouls / 2;
    absorbGame(maps, {
      gameId: game.gameId,
      date: game.date,
      season: game.season,
      homeTeam,
      awayTeam,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      totalPim: game.totalFouls,
      homePim,
      awayPim,
      homeMinors: game.homeMinors ?? Math.round(homePim / 2),
      awayMinors: game.awayMinors ?? Math.round(awayPim / 2),
      wentToOvertime: game.wentToOvertime ?? false,
      closingTotal: game.closingTotal,
      homeSpread: game.homeSpread,
      crew: game.officials,
      lineSource: game.lineSource,
    });
  }
}

/** Seasons with enough logged games to claim as covered in meta.seasons. */
function seasonsWithMeaningfulCoverage(logs: GameLogEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const game of logs) {
    if (!game.season) continue;
    counts.set(game.season, (counts.get(game.season) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= MEANINGFUL_SEASON_MIN_GAMES)
    .map(([season]) => season)
    .sort();
}

function createEmptyMaps(): BuildMaps {
  const teamByCrew = new Map<string, Map<string, TeamCrewBucket>>();
  for (const abbr of NHL_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }
  return {
    refGames: new Map(),
    refMinorGames: new Map(),
    refMeta: new Map(),
    refTeamBuckets: new Map(),
    refBetting: new Map(),
    teamByCrew,
    exportedGameLogs: [],
    allDates: [],
    linedGames: 0,
  };
}

/**
 * Rebuild ref-stats + teamSplits from stored game logs (no network).
 * meta.seasons lists only seasons with meaningful coverage; totals include all logs.
 */
function buildStatsFromLogs(rawLogs: GameLogEntry[]): RefStatsFile {
  const dedupedLogs = dedupeGameLogs(rawLogs);
  const maps = createEmptyMaps();
  replayGameLogs(dedupedLogs, maps);
  maps.allDates.sort();
  const allGameRecords = [...maps.refGames.values()].flat();

  const nhlBaselines = buildBaselinesFile([], dedupedLogs).NHL.aggregate;
  const leagueAvgTotal = nhlBaselines.leagueAvgTotal;
  const leagueAvgFouls = nhlBaselines.leagueAvgFouls;
  const leagueOverBaseline = nhlBaselines.leagueOverBaseline;
  const leagueAvgMinors =
    nhlBaselines.leagueAvgMinors ?? computeLeagueAvgMinors(allGameRecords);
  const leagueOvertimeRate =
    nhlBaselines.leagueOvertimeRate ?? computeLeagueOvertimeRate(allGameRecords);

  let teamSpecialTeams: Record<string, { ppPct: number; pkPct: number }> = {};
  try {
    const stPath = path.join(process.cwd(), "data", "nhl", "team-special-teams.json");
    if (fs.existsSync(stPath)) {
      const parsed = JSON.parse(fs.readFileSync(stPath, "utf8")) as {
        teams: Record<string, { ppPct: number; pkPct: number }>;
      };
      teamSpecialTeams = parsed.teams;
    }
  } catch {
    /* optional file */
  }

  const refs: RefProfile[] = [];
  for (const [slug, games] of maps.refGames) {
    const meta = maps.refMeta.get(slug)!;
    const avgTotal = games.reduce((s, g) => s + g.totalPoints, 0) / games.length;
    const overRate = games.filter((g) => g.overHit).length / games.length;
    const avgFouls = games.reduce((s, g) => s + g.totalFouls, 0) / games.length;
    const minorGames = maps.refMinorGames.get(slug) ?? [];
    const nhlAnalytics =
      meta.role === "referee"
        ? computeNhlRefAnalytics(minorGames, leagueAvgMinors)
        : undefined;
    const betting = maps.refBetting.get(slug)?.finalize();

    refs.push({
      slug,
      name: meta.name,
      number: meta.number,
      role: meta.role,
      games: games.length,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      homeCoverRate: betting ? homeCoverRate(betting) : null,
      totalPointsDelta: round1(avgTotal - leagueAvgTotal),
      foulsDelta: round1(avgFouls - leagueAvgFouls),
      seasons: [...new Set(games.map((g) => g.season))],
      recentGames: games.slice(-8).reverse(),
      teamStats: collectRefTeamStats(maps.refTeamBuckets.get(slug) ?? new Map()),
      bettingStats: betting,
      nhlAnalytics,
    });
  }
  refs.sort((a, b) => b.games - a.games);
  dedupeRefsInPlace(refs, leagueAvgTotal, leagueAvgFouls);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  for (const abbr of NHL_TEAM_ABBRS) {
    teamSplits[abbr] = [...maps.teamByCrew.get(abbr)!.entries()]
      .map(([key, data]) =>
        buildTeamSplit(key, data.crewNames, data.games, leagueAvgTotal),
      )
      .sort((a, b) => b.games - a.games);
  }

  const coveredSeasons = seasonsWithMeaningfulCoverage(dedupedLogs);
  const allSeasonLabels = [...new Set(dedupedLogs.map((g) => g.season))].sort();
  const thinSeasons = allSeasonLabels.filter((s) => !coveredSeasons.includes(s));
  if (thinSeasons.length > 0) {
    console.log(
      `Meaningful seasons (${MEANINGFUL_SEASON_MIN_GAMES}+ games): ${coveredSeasons.join(", ") || "(none)"}`,
    );
    console.log(
      `Truncated / partial seasons omitted from meta.seasons: ${thinSeasons.join(", ")}`,
    );
  }

  const refsWithBetting = refs.filter((r) => r.bettingStats?.linesAvailable).length;
  const atsAvailable = maps.linedGames >= 50 && refsWithBetting >= 3;

  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: coveredSeasons,
      leagueAvgTotal,
      leagueAvgFouls,
      leagueOverBaseline,
      minSampleSize: MIN_SAMPLE,
      source: "nhl-api",
      data_verified: true,
      data_source: "NHL API (api-web.nhle.com)",
      atsAvailable,
      refCount: refs.length,
      totalGamesProcessed: dedupedLogs.length,
      dateRange: {
        earliest: maps.allDates[0],
        latest: maps.allDates[maps.allDates.length - 1],
      },
      leagueAvgMinors,
      leagueOvertimeRate,
      teamSpecialTeams:
        Object.keys(teamSpecialTeams).length > 0 ? teamSpecialTeams : undefined,
      note: atsAvailable
        ? `Scores, PIM, and crews from NHL API. ATS/O-U from synthetic closing lines derived from final scores (${maps.linedGames}/${dedupedLogs.length} games). Descriptive only, not market odds.`
        : undefined,
    },
    refs,
    teamSplits,
  };
}

interface TeamGameRow {
  totalPoints: number;
  totalFouls: number;
  overHit: boolean;
  teamFouls: number;
  opponentFouls: number;
  teamWin: boolean;
  isHome: boolean;
}

type TeamCrewBucket = { crewNames: string[]; games: TeamGameRow[] };

function buildTeamSplit(
  key: string,
  crewNames: string[],
  games: TeamGameRow[],
  leagueAvgTotal: number,
): TeamCrewSplit {
  const n = games.length;
  const wins = games.filter((g) => g.teamWin).length;
  const homeGames = games.filter((g) => g.isHome);
  const awayGames = games.filter((g) => !g.isHome);
  const avgTotal = games.reduce((s, g) => s + g.totalPoints, 0) / n;
  const avgFouls = games.reduce((s, g) => s + g.totalFouls, 0) / n;
  const avgTeamFouls = games.reduce((s, g) => s + g.teamFouls, 0) / n;
  const avgOpponentFouls = games.reduce((s, g) => s + g.opponentFouls, 0) / n;

  return {
    crewKey: key,
    crewNames,
    games: n,
    avgTotalPoints: round1(avgTotal),
    overRate: round3(games.filter((g) => g.overHit).length / n),
    avgFouls: round1(avgFouls),
    wins,
    losses: n - wins,
    totalDelta: round1(avgTotal - leagueAvgTotal),
    homeGames: homeGames.length,
    awayGames: awayGames.length,
    homeWins: homeGames.filter((g) => g.teamWin).length,
    homeLosses: homeGames.filter((g) => !g.teamWin).length,
    awayWins: awayGames.filter((g) => g.teamWin).length,
    awayLosses: awayGames.filter((g) => !g.teamWin).length,
    avgTeamFouls: round1(avgTeamFouls),
    avgOpponentFouls: round1(avgOpponentFouls),
    foulDifferential: round1(avgTeamFouls - avgOpponentFouls),
  };
}

function syntheticClosingLine(
  homeScore: number,
  awayScore: number,
): { total: number; homeSpread: number } {
  const actualTotal = homeScore + awayScore;
  const total = Math.round((actualTotal + (Math.random() - 0.5) * 1.5) * 2) / 2;
  const margin = homeScore - awayScore;
  const homeSpread = Math.round((-margin / 2 + (Math.random() - 0.5)) * 2) / 2;
  return { total: Math.max(4.5, Math.min(8.5, total)), homeSpread };
}

async function buildLiveStats(): Promise<RefStatsFile | null> {
  const maxGames = Number.parseInt(process.env.REF_MAX_GAMES ?? "15000", 10);
  const officials = await fetchOfficialsMap();
  const refGames = new Map<string, RefGameRecord[]>();
  const refMinorGames = new Map<string, RefGameRecord[]>();
  const refMeta = new Map<
    string,
    { name: string; number: number; role: RefRole }
  >();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const teamByCrew = new Map<string, Map<string, TeamCrewBucket>>();
  const exportedGameLogs: GameLogEntry[] = [];
  const allDates: string[] = [];
  for (const abbr of NHL_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }

  const maps: BuildMaps = {
    refGames,
    refMinorGames,
    refMeta,
    refTeamBuckets,
    teamByCrew,
    exportedGameLogs,
    allDates,
  };

  const existingLogs = loadGameLogs("NHL");
  const skipGameIds = new Set(
    (existingLogs?.games ?? []).map((g) => String(g.gameId)),
  );
  if (skipGameIds.size > 0) {
    console.log(`Resuming: ${skipGameIds.size} games already in game-logs.json`);
  }

  console.log(`Collecting schedules for ${NHL_TEN_SEASONS.length} seasons...`);
  const gameMap = await collectTenSeasonGames();
  const queue = [...gameMap.entries()].sort((a, b) =>
    a[1].date.localeCompare(b[1].date),
  );
  console.log(`Processing ${queue.length} unique regular-season games...`);

  let processed = 0;
  let skipped = skipGameIds.size;

  const pending = queue.filter(([id]) => !skipGameIds.has(String(id)));

  let skippedNoCrew = 0;
  let skippedNoBox = 0;
  let skippedBadTeam = 0;

  async function fetchAndAbsorbOne(
    gameId: number,
    date: string,
    game: ScheduleGame,
  ): Promise<boolean> {
    try {
      const homeTeam = normalizeNhlTeamAbbr(game.homeTeam.abbrev);
      const awayTeam = normalizeNhlTeamAbbr(game.awayTeam.abbrev);
      if (!NHL_TEAM_ABBRS.includes(homeTeam) || !NHL_TEAM_ABBRS.includes(awayTeam)) {
        skippedBadTeam++;
        return false;
      }

      const crew = await fetchCrewWithRetry(game.id, officials);
      if (crew.length === 0) {
        skippedNoCrew++;
        return false;
      }

      const skipPbp = process.env.NHL_SKIP_PBP === "1";
      const [box, penalties] = await Promise.all([
        fetchBoxscore(game.id),
        skipPbp ? Promise.resolve(null) : fetchGamePenalties(game.id),
      ]);
      if (!box) {
        skippedNoBox++;
        return false;
      }

      const wentToOvertime =
        penalties?.wentToOvertime ??
        inferOvertimeFromSchedule(game.periodDescriptor?.periodType);
      const homeMinors = penalties?.homeMinors ?? Math.round(box.homePim / 2);
      const awayMinors = penalties?.awayMinors ?? Math.round(box.awayPim / 2);
      const totalPim = penalties?.totalPim ?? box.homePim + box.awayPim;
      const closing = syntheticClosingLine(box.homeScore, box.awayScore);
      const season = seasonFromDate(date);

      absorbGame(maps, {
        gameId: String(game.id),
        date,
        season,
        homeTeam,
        awayTeam,
        homeScore: box.homeScore,
        awayScore: box.awayScore,
        totalPim,
        homePim: box.homePim,
        awayPim: box.awayPim,
        homeMinors,
        awayMinors,
        wentToOvertime,
        closingTotal: closing.total,
        homeSpread: closing.homeSpread,
        crew,
        lineSource: "synthetic",
      });
      return true;
    } catch (err) {
      console.warn(`Game ${gameId} skipped: ${err}`);
      return false;
    }
  }

  const CONCURRENCY = Math.max(2, Math.min(16, FETCH_CONCURRENCY));
  console.log(
    `Fetching ${pending.length} missing games (concurrency=${CONCURRENCY}, cached=${skipped})...`,
  );

  for (let i = 0; i < pending.length && processed < maxGames; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(([gameId, { date, game }]) =>
        fetchAndAbsorbOne(gameId, date, game),
      ),
    );
    processed += results.filter(Boolean).length;
    // Pace requests so right-rail keeps returning officials.
    await sleep(120);

    if (processed > 0 && processed % 25 === 0) {
      const partial = dedupeGameLogs([
        ...(existingLogs?.games ?? []),
        ...exportedGameLogs,
      ]);
      saveGameLogs({
        lastUpdated: new Date().toISOString(),
        league: "NHL",
        source: "nhl-api",
        games: partial,
      });
      console.log(
        `  …${processed} new / ${partial.length} total ` +
          `(noCrew=${skippedNoCrew}, noBox=${skippedNoBox}, badTeam=${skippedBadTeam})`,
      );
    }
  }

  console.log(
    `Fetch done: +${processed} new. Skips: noCrew=${skippedNoCrew} noBox=${skippedNoBox} badTeam=${skippedBadTeam}`,
  );

  if (processed + (existingLogs?.games.length ?? 0) < MIN_GAMES_FOR_LIVE_BUILD) {
    const total = processed + (existingLogs?.games.length ?? 0);
    // Persist whatever we fetched so the next run can resume.
    const partial = dedupeGameLogs([
      ...(existingLogs?.games ?? []),
      ...exportedGameLogs,
    ]);
    saveGameLogs({
      lastUpdated: new Date().toISOString(),
      league: "NHL",
      source: "nhl-api",
      games: partial,
    });
    console.warn(
      `Only ${partial.length} NHL games on disk (${processed} new this run) — ` +
        `need >= ${MIN_GAMES_FOR_LIVE_BUILD} before publishing ref-stats. Resuming later.`,
    );
    return null;
  }

  const dedupedLogs = dedupeGameLogs([
    ...(existingLogs?.games ?? []),
    ...exportedGameLogs,
  ]);

  saveGameLogs({
    lastUpdated: new Date().toISOString(),
    league: "NHL",
    source: "nhl-api",
    games: dedupedLogs,
  });

  const nbaLogs = loadGameLogs("NBA");
  const nflLogs = loadGameLogs("NFL");
  const eplLogs = loadGameLogs("EPL");
  saveBaselines(
    buildBaselinesFile(
      nbaLogs?.games ?? [],
      dedupedLogs,
      "NHL build snapshot",
      nflLogs?.games ?? [],
      eplLogs?.games ?? [],
    ),
  );

  return buildStatsFromLogs(dedupedLogs);
}

function writeSeasonShards(logs: GameLogEntry[]): void {
  fs.mkdirSync(NHL_SHARD_DIR, { recursive: true });
  const bySeason = new Map<string, GameLogEntry[]>();
  for (const game of logs) {
    const season = game.season;
    if (!season) continue;
    const bucket = bySeason.get(season) ?? [];
    bucket.push(game);
    bySeason.set(season, bucket);
  }
  for (const [season, games] of bySeason) {
    const shardPath = path.join(NHL_SHARD_DIR, `${season}.ndjson`);
    const body = games
      .sort((a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId))
      .map((g) => JSON.stringify(g))
      .join("\n");
    fs.writeFileSync(shardPath, body ? `${body}\n` : "");
  }
  console.log(`Wrote ${bySeason.size} season shards to data/nhl/game-logs/`);
}

function writeNhlManifest(stats: RefStatsFile, gameCount: number): void {
  const manifest = {
    data_verified: stats.meta.data_verified === true,
    data_source: stats.meta.data_source ?? "NHL API (api-web.nhle.com)",
    last_ingested_at: stats.meta.lastUpdated,
    game_count: gameCount,
    seasons: stats.meta.seasons,
    ref_count: stats.meta.refCount ?? stats.refs.length,
    note: "Officials and scores from NHL API gamecenter endpoints.",
  };
  fs.mkdirSync(NHL_DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(NHL_DATA_DIR, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

function publishNhlArtifacts(stats: RefStatsFile, logs: GameLogEntry[]): void {
  const validation = validateNhlGameLogs(logs, {
    minGames: MIN_GAMES_FOR_LIVE_BUILD,
  });
  console.log(formatValidationReport(validation));
  if (!validation.passed) {
    throw new Error("NHL ingest validation failed - refusing to publish");
  }
  writeSeasonShards(logs);
  writeNhlManifest(stats, logs.length);
}

function writeNhlStats(stats: RefStatsFile, statsPath: string, label: string): void {
  const dataDir = path.dirname(statsPath);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(statsPath, `${JSON.stringify(stats, null, 2)}\n`);
  const qualified = stats.refs.reduce(
    (sum, ref) =>
      sum +
      Object.values(ref.teamStats ?? {}).filter((s) => s.games >= 3).length,
    0,
  );
  const pairs = stats.refs.reduce(
    (sum, ref) => sum + Object.keys(ref.teamStats ?? {}).length,
    0,
  );
  console.log(
    `${label}: ${stats.refs.length} officials, ${stats.meta.totalGamesProcessed} games, ` +
      `${stats.meta.seasons.length} seasons (${stats.meta.seasons.join(", ")})`,
  );
  console.log(`Matrix coverage: ${qualified}/${pairs} ref×team pairs with 3+ games`);
  const top = stats.refs.slice(0, 5);
  for (const ref of top) {
    console.log(`  ${ref.name}: ${ref.games} games`);
  }
}

async function main() {
  const dataDir = path.join(process.cwd(), "data", "nhl");
  const statsPath = path.join(dataDir, "ref-stats.json");
  const fromLogs =
    process.argv.includes("--from-logs") || process.env.NHL_FROM_LOGS === "1";

  if (fromLogs) {
    console.log("=== Ref Watch NHL rebuild from game-logs.json ===\n");
    const existing = loadGameLogs("NHL");
    if (!existing || existing.games.length === 0) {
      console.error("No NHL game logs found at data/nhl/game-logs.json");
      process.exit(1);
    }
    const deduped = dedupeGameLogs(existing.games);
    saveGameLogs({
      lastUpdated: new Date().toISOString(),
      league: "NHL",
      source: existing.source ?? "nhl-api",
      games: deduped,
    });
    const nbaLogs = loadGameLogs("NBA");
    const nflLogs = loadGameLogs("NFL");
    const eplLogs = loadGameLogs("EPL");
    saveBaselines(
      buildBaselinesFile(
        nbaLogs?.games ?? [],
        deduped,
        "NHL rebuild-from-logs snapshot",
        nflLogs?.games ?? [],
        eplLogs?.games ?? [],
      ),
    );
    const stats = buildStatsFromLogs(deduped);
    publishNhlArtifacts(stats, deduped);
    writeNhlStats(stats, statsPath, "Rebuilt from logs");
    console.log("\n--- Regenerating overview insights ---");
    const { runPostIngestInsightGenerator: refreshInsights } = await import(
      "../lib/post-ingest-insights"
    );
    refreshInsights();
    return;
  }

  console.log("=== Ref Watch NHL data build (10 seasons) ===\n");

  const live = await buildLiveStats();
  if (live) {
    const existing = loadGameLogs("NHL");
    const deduped = dedupeGameLogs(existing?.games ?? []);
    publishNhlArtifacts(live, deduped);
    writeNhlStats(live, statsPath, "Live ref stats");
    console.log("\n--- Regenerating overview insights ---");
    const { runPostIngestInsightGenerator: refreshInsights } = await import(
      "../lib/post-ingest-insights"
    );
    refreshInsights();
    return;
  }

  console.error(
    "NHL live build failed — no verified output written. Re-run with network access, " +
      "or rebuild from existing logs: npm run rebuild-nhl-from-logs",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

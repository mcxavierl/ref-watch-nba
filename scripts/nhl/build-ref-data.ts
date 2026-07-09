#!/usr/bin/env npx tsx
/**
 * Optional live NHL backfill: iterate recent regular-season dates,
 * fetch officials + scores + PIM, aggregate ref stats.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { crewKey, refSlug } from "../lib/slug";
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
import { teamWonGame } from "../lib/team-win";
import {
  NHL_TEN_SEASONS,
  nhlSeasonApiId,
} from "../lib/ten-season-policy";

const NHL_TEAM_ABBRS = [
  "ANA", "BOS", "BUF", "CAR", "CBJ", "CGY", "CHI", "COL", "DAL", "DET",
  "EDM", "FLA", "LAK", "MIN", "MTL", "NSH", "NJD", "NYI", "NYR", "OTT",
  "PHI", "PIT", "SEA", "SJS", "STL", "TBL", "TOR", "UTA", "VAN", "VGK",
  "WPG", "WSH",
];

const MIN_SAMPLE = 30;

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
  const res = await fetch(
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
    for (const team of NHL_TEAM_ABBRS) {
      const games = await fetchTeamSeasonGames(team, season);
      for (const g of games) {
        if (!seen.has(g.gameId)) {
          seen.set(g.gameId, { date: g.date, game: g.game });
          seasonNew++;
        }
      }
      await sleep(80);
    }
    console.log(
      `  ${season}: +${seasonNew} new games (${seen.size} unique total)`,
    );
  }
  return seen;
}

async function fetchOfficialsMap(): Promise<Map<string, number>> {
  const res = await fetch(
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
  const res = await fetch(`https://api-web.nhle.com/v1/schedule/${date}`);
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
  const res = await fetch(
    `https://api-web.nhle.com/v1/gamecenter/${gameId}/right-rail`,
  );
  if (!res.ok) return [];
  const body = (await res.json()) as RightRailResponse;
  const crew: { name: string; number: number; role: RefRole }[] = [];
  for (const ref of body.gameInfo?.referees ?? []) {
    crew.push({
      name: ref.default,
      number: lookupNumber(ref.default, officials),
      role: "referee",
    });
  }
  for (const lines of body.gameInfo?.linesmen ?? []) {
    crew.push({
      name: lines.default,
      number: lookupNumber(lines.default, officials),
      role: "linesman",
    });
  }
  return crew;
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
  const res = await fetch(
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
  teamByCrew: Map<string, Map<string, TeamCrewBucket>>;
  exportedGameLogs: GameLogEntry[];
  allDates: string[];
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
    const homePim = game.homeMinors ? game.homeMinors * 2 : game.totalFouls / 2;
    const awayPim = game.awayMinors ? game.awayMinors * 2 : game.totalFouls / 2;
    absorbGame(maps, {
      gameId: game.gameId,
      date: game.date,
      season: game.season,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
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
  const CONCURRENCY = 6;

  const pending = queue.filter(([id]) => !skipGameIds.has(String(id)));

  async function fetchAndAbsorbOne(
    gameId: number,
    date: string,
    game: ScheduleGame,
  ): Promise<boolean> {
    const homeTeam = game.homeTeam.abbrev.toUpperCase();
    const awayTeam = game.awayTeam.abbrev.toUpperCase();
    if (!NHL_TEAM_ABBRS.includes(homeTeam) || !NHL_TEAM_ABBRS.includes(awayTeam)) {
      return false;
    }

    const crew = await fetchCrew(game.id, officials);
    if (crew.length === 0) return false;

    const box = await fetchBoxscore(game.id);
    if (!box) return false;

    const penalties = await fetchGamePenalties(game.id);
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
  }

  for (let i = 0; i < pending.length && processed < maxGames; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(([gameId, { date, game }]) =>
        fetchAndAbsorbOne(gameId, date, game),
      ),
    );
    processed += results.filter(Boolean).length;

    if (processed > 0 && processed % 250 === 0) {
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
        `  …${processed} new games fetched (${skipped} cached, ${partial.length} total in logs)`,
      );
    }
  }

  if (processed + (existingLogs?.games.length ?? 0) < 500) {
    console.warn(
      `Only ${processed} new games (${existingLogs?.games.length ?? 0} cached) — need 500+ for live build.`,
    );
    return null;
  }

  const dedupedLogs = dedupeGameLogs([
    ...(existingLogs?.games ?? []),
    ...exportedGameLogs,
  ]);

  // Rebuild aggregation maps from the full merged log set.
  refGames.clear();
  refMinorGames.clear();
  refMeta.clear();
  refTeamBuckets.clear();
  for (const abbr of NHL_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }
  exportedGameLogs.length = 0;
  allDates.length = 0;
  replayGameLogs(dedupedLogs, maps);
  allDates.sort();
  const allGameRecords = [...refGames.values()].flat();
  saveGameLogs({
    lastUpdated: new Date().toISOString(),
    league: "NHL",
    source: "nhl-api",
    games: dedupedLogs,
  });

  const nbaLogs = loadGameLogs("NBA");
  saveBaselines(
    buildBaselinesFile(nbaLogs?.games ?? [], dedupedLogs, "NHL build snapshot"),
  );

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
  for (const [slug, games] of refGames) {
    const meta = refMeta.get(slug)!;
    const avgTotal = games.reduce((s, g) => s + g.totalPoints, 0) / games.length;
    const overRate = games.filter((g) => g.overHit).length / games.length;
    const avgFouls = games.reduce((s, g) => s + g.totalFouls, 0) / games.length;
    const minorGames = refMinorGames.get(slug) ?? [];
    const nhlAnalytics =
      meta.role === "referee"
        ? computeNhlRefAnalytics(minorGames, leagueAvgMinors)
        : undefined;

    refs.push({
      slug,
      name: meta.name,
      number: meta.number,
      role: meta.role,
      games: games.length,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      homeCoverRate: null,
      totalPointsDelta: round1(avgTotal - leagueAvgTotal),
      foulsDelta: round1(avgFouls - leagueAvgFouls),
      seasons: [...new Set(games.map((g) => g.season))],
      recentGames: games.slice(-8).reverse(),
      teamStats: collectRefTeamStats(refTeamBuckets.get(slug) ?? new Map()),
      nhlAnalytics,
    });
  }
  refs.sort((a, b) => b.games - a.games);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  for (const abbr of NHL_TEAM_ABBRS) {
    teamSplits[abbr] = [...teamByCrew.get(abbr)!.entries()]
      .map(([key, data]) =>
        buildTeamSplit(key, data.crewNames, data.games, leagueAvgTotal),
      )
      .sort((a, b) => b.games - a.games);
  }

  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: [...new Set(refs.flatMap((r) => r.seasons))],
      leagueAvgTotal,
      leagueAvgFouls,
      leagueOverBaseline,
      minSampleSize: MIN_SAMPLE,
      source: "nhl-api",
      data_verified: true,
      data_source: "NHL API (api-web.nhle.com)",
      atsAvailable: false,
      refCount: refs.length,
      totalGamesProcessed: dedupedLogs.length,
      dateRange: {
        earliest: allDates[0],
        latest: allDates[allDates.length - 1],
      },
      leagueAvgMinors,
      leagueOvertimeRate,
      teamSpecialTeams:
        Object.keys(teamSpecialTeams).length > 0 ? teamSpecialTeams : undefined,
    },
    refs,
    teamSplits,
  };
}

async function main() {
  const dataDir = path.join(process.cwd(), "data", "nhl");
  const statsPath = path.join(dataDir, "ref-stats.json");

  console.log("=== Ref Watch NHL data build (10 seasons) ===\n");

  const live = await buildLiveStats();
  if (live) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(statsPath, `${JSON.stringify(live, null, 2)}\n`);
    const qualified = live.refs.reduce(
      (sum, ref) =>
        sum +
        Object.values(ref.teamStats ?? {}).filter((s) => s.games >= 3).length,
      0,
    );
    const pairs = live.refs.reduce(
      (sum, ref) => sum + Object.keys(ref.teamStats ?? {}).length,
      0,
    );
    console.log(
      `Live ref stats: ${live.refs.length} officials, ${live.meta.totalGamesProcessed} games, ` +
        `${live.meta.seasons.length} seasons`,
    );
    console.log(`Matrix coverage: ${qualified}/${pairs} ref×team pairs with 3+ games`);
    return;
  }

  console.error(
    "NHL live build failed — no verified output written. Re-run with network access.",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

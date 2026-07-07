import * as fs from "node:fs";
import * as path from "node:path";
import { NBA_STATS_HEADERS } from "./nba-headers";
import { crewKey, refSlug } from "./slug";
import {
  collectRefTeamStats,
  pushRefTeamGame,
  type RefTeamGameRow,
} from "./ref-team-stats";
import {
  generateClosingLines,
  homeCoverRate,
  RefBettingAccumulator,
} from "./ref-betting";
import {
  dedupeGameLogs,
  loadGameLogs,
  saveGameLogs,
  toOfficials,
  type GameLogEntry,
} from "./game-logs";
import {
  buildBaselinesFile,
  saveBaselines,
} from "./baselines";
import type {
  RefGameRecord,
  RefProfile,
  RefStatsFile,
  TeamCrewSplit,
} from "./types";

const NBA_TEAM_ABBRS = [
  "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
];

const STATS_BASE = "https://stats.nba.com/stats";
const FETCH_TIMEOUT_MS = 12_000;
const MIN_SAMPLE = 30;
const REQUEST_DELAY_MS = 300;

/** Three most recent completed/in-progress regular seasons from build date. */
const SEASONS = [
  { label: "2023-24", param: "2023-24" },
  { label: "2024-25", param: "2024-25" },
  { label: "2025-26", param: "2025-26" },
];

function maxGamesPerSeason(): number | null {
  const raw = process.env.REF_MAX_GAMES_PER_SEASON;
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface NbaResultSet {
  name: string;
  headers: string[];
  rowSet: unknown[][];
}

interface NbaResponse {
  resultSets: NbaResultSet[];
}

async function nbaFetch(url: string): Promise<NbaResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: NBA_STATS_HEADERS,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as NbaResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function resultSet(
  data: NbaResponse,
  name: string,
): { headers: string[]; rows: unknown[][] } | null {
  const set = data.resultSets.find((r) => r.name === name);
  if (!set) return null;
  return { headers: set.headers, rows: set.rowSet };
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashGameId(gameId: string): number {
  let h = 0;
  for (let i = 0; i < gameId.length; i++) {
    h = (h * 31 + gameId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function linesForGame(gameId: string) {
  return generateClosingLines(mulberry32(hashGameId(gameId)));
}

function loadGameLinesMap(): Map<
  string,
  { homeSpread: number; total: number }
> {
  const filePath = path.join(process.cwd(), "data", "game-lines.json");
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
      lines: { gameId: string; homeSpread: number; total: number }[];
    };
    return new Map(raw.lines.map((l) => [l.gameId, l]));
  } catch {
    return new Map();
  }
}

function rowValue(
  headers: string[],
  row: unknown[],
  key: string,
): string | number | null {
  const idx = headers.indexOf(key);
  if (idx < 0) return null;
  const val = row[idx];
  if (typeof val === "string" || typeof val === "number") return val;
  return null;
}

async function fetchSeasonGames(season: string): Promise<string[]> {
  const url = `${STATS_BASE}/leaguegamefinder?LeagueID=00&Season=${encodeURIComponent(season)}&SeasonType=Regular+Season&PlayerOrTeam=T`;
  const data = await nbaFetch(url);
  if (!data) return [];

  const rs = resultSet(data, "LeagueGameFinderResults");
  if (!rs) return [];

  const ids = new Set<string>();
  for (const row of rs.rows) {
    const gameId = rowValue(rs.headers, row, "GAME_ID");
    if (typeof gameId === "string") ids.add(gameId);
  }
  return [...ids];
}

interface GameBoxData {
  gameId: string;
  date: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homeFouls: number;
  awayFouls: number;
  totalFouls: number;
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

type TeamCrewBucket = {
  crewNames: string[];
  games: TeamGameRow[];
};

async function fetchGameBox(
  gameId: string,
  season: string,
): Promise<GameBoxData | null> {
  const url = `${STATS_BASE}/boxscoretraditionalv2?GameID=${gameId}`;
  const data = await nbaFetch(url);
  if (!data) return null;

  const teamStats = resultSet(data, "TeamStats");
  const gameSummary = resultSet(data, "GameSummary");
  if (!teamStats || teamStats.rows.length < 2) return null;

  let homeTeam = "";
  let awayTeam = "";
  let homeScore = 0;
  let awayScore = 0;
  let homeFouls = 0;
  let awayFouls = 0;

  for (const row of teamStats.rows) {
    const abbr = rowValue(teamStats.headers, row, "TEAM_ABBREVIATION");
    const pts = rowValue(teamStats.headers, row, "PTS");
    const pf = rowValue(teamStats.headers, row, "PF");
    const matchup = rowValue(teamStats.headers, row, "MATCHUP");
    if (typeof abbr !== "string") continue;
    const points = typeof pts === "number" ? pts : 0;
    const fouls = typeof pf === "number" ? pf : 0;

    if (typeof matchup === "string" && matchup.includes(" @ ")) {
      awayTeam = abbr;
      awayScore = points;
      awayFouls = fouls;
    } else {
      homeTeam = abbr;
      homeScore = points;
      homeFouls = fouls;
    }
  }

  const totalFouls = homeFouls + awayFouls;

  let date = "";
  if (gameSummary && gameSummary.rows[0]) {
    const gd = rowValue(gameSummary.headers, gameSummary.rows[0], "GAME_DATE_EST");
    if (typeof gd === "string") date = gd.slice(0, 10);
  }

  return {
    gameId,
    date,
    season,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    homeFouls,
    awayFouls,
    totalFouls,
  };
}

function buildTeamSplit(
  crewKey: string,
  crewNames: string[],
  games: TeamGameRow[],
  leagueAvgTotal: number,
): TeamCrewSplit {
  const n = games.length;
  const wins = games.filter((g) => g.teamWin).length;
  const homeGames = games.filter((g) => g.isHome);
  const awayGames = games.filter((g) => !g.isHome);
  const avgTotal =
    games.reduce((s, g) => s + g.totalPoints, 0) / n;
  const avgFouls =
    games.reduce((s, g) => s + g.totalFouls, 0) / n;
  const avgTeamFouls =
    games.reduce((s, g) => s + g.teamFouls, 0) / n;
  const avgOpponentFouls =
    games.reduce((s, g) => s + g.opponentFouls, 0) / n;

  return {
    crewKey,
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

function teamGameRow(
  box: GameBoxData,
  teamAbbr: string,
  overBaseline: number,
): TeamGameRow | null {
  const isHome = box.homeTeam === teamAbbr;
  const isAway = box.awayTeam === teamAbbr;
  if (!isHome && !isAway) return null;

  const totalPoints = box.homeScore + box.awayScore;
  const teamWin = isHome
    ? box.homeScore > box.awayScore
    : box.awayScore > box.homeScore;

  return {
    totalPoints,
    totalFouls: box.totalFouls,
    overHit: totalPoints > overBaseline,
    teamFouls: isHome ? box.homeFouls : box.awayFouls,
    opponentFouls: isHome ? box.awayFouls : box.homeFouls,
    teamWin,
    isHome,
  };
}

function pushTeamGame(
  buckets: Map<string, TeamCrewBucket>,
  key: string,
  crewNames: string[],
  row: TeamGameRow,
): void {
  const existing = buckets.get(key) ?? { crewNames, games: [] };
  existing.games.push(row);
  buckets.set(key, existing);
}

function collectTeamSplits(
  buckets: Map<string, TeamCrewBucket>,
  leagueAvgTotal: number,
): TeamCrewSplit[] {
  return [...buckets.entries()]
    .map(([key, data]) => {
      if (data.games.length === 0) return null;
      return buildTeamSplit(key, data.crewNames, data.games, leagueAvgTotal);
    })
    .filter((s): s is TeamCrewSplit => s !== null)
    .sort((a, b) => b.games - a.games);
}

async function fetchGameOfficials(
  gameId: string,
): Promise<{ name: string; number: number }[]> {
  const url = `${STATS_BASE}/boxscoresummaryv2?GameID=${gameId}`;
  const data = await nbaFetch(url);
  if (!data) return [];

  const officials = resultSet(data, "Officials");
  if (!officials) return [];

  return officials.rows
    .map((row) => {
      const name = rowValue(officials.headers, row, "FIRST_NAME");
      const last = rowValue(officials.headers, row, "FAMILY_NAME");
      const num = rowValue(officials.headers, row, "JERSEY_NUM");
      if (typeof name !== "string" || typeof last !== "string") return null;
      const number =
        typeof num === "number"
          ? num
          : typeof num === "string"
            ? Number.parseInt(num, 10) || 0
            : 0;
      return { name: `${name} ${last}`, number };
    })
    .filter((r): r is { name: string; number: number } => r !== null);
}

function loadSeed(): RefStatsFile {
  const seedPath = path.join(process.cwd(), "data", "ref-stats.seed.json");
  return JSON.parse(fs.readFileSync(seedPath, "utf8")) as RefStatsFile;
}

async function buildFromApi(): Promise<RefStatsFile | null> {
  // Quick probe — avoid long hangs when stats.nba.com blocks the network
  console.log("Probing NBA Stats API...");
  const probeIds = await fetchSeasonGames("2024-25");
  if (probeIds.length === 0) {
    console.warn("Probe failed: no game IDs returned");
    return null;
  }
  const probeBox = await fetchGameBox(probeIds[0], "2024-25");
  const probeOfficials = await fetchGameOfficials(probeIds[0]);
  if (!probeBox || probeOfficials.length === 0) {
    console.warn("Probe failed: box score or officials unavailable");
    return null;
  }
  console.log("API probe OK — starting backfill (this may take several minutes)...");

  const refGames = new Map<string, RefGameRecord[]>();
  const refMeta = new Map<string, { name: string; number: number }>();
  const refBetting = new Map<string, RefBettingAccumulator>();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const teamByCrew = new Map<string, Map<string, TeamCrewBucket>>();
  const exportedGameLogs: GameLogEntry[] = [];
  const externalLines = loadGameLinesMap();
  let usedExternalLines = false;
  for (const abbr of NBA_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }

  let processed = 0;
  let skipped = 0;
  const gameCap = maxGamesPerSeason();
  const allDates: string[] = [];

  for (const season of SEASONS) {
    console.log(`Fetching game list for ${season.label}...`);
    const gameIds = await fetchSeasonGames(season.param);
    if (gameIds.length === 0) {
      console.warn(`No games returned for ${season.label}`);
      continue;
    }

    const sample = gameCap ? gameIds.slice(0, gameCap) : gameIds;
    console.log(
      `Processing ${sample.length} of ${gameIds.length} games for ${season.label}...`,
    );

    for (const gameId of sample) {
      const [box, officials] = await Promise.all([
        fetchGameBox(gameId, season.label),
        fetchGameOfficials(gameId),
      ]);
      if (!box || officials.length === 0) {
        skipped++;
        continue;
      }

      if (box.date) allDates.push(box.date);

      const linesRaw =
        externalLines.get(gameId) ?? linesForGame(gameId);
      const lineSource = externalLines.has(gameId) ? "external" : "synthetic";

      const totalPoints = box.homeScore + box.awayScore;
      const overHit = totalPoints > linesRaw.total;
      const raptorsInvolved =
        box.homeTeam === "TOR" || box.awayTeam === "TOR";

      const record: RefGameRecord = {
        gameId,
        date: box.date,
        season: season.label,
        homeTeam: box.homeTeam,
        awayTeam: box.awayTeam,
        totalPoints,
        totalFouls: box.totalFouls,
        overHit,
        raptorsInvolved,
        closingTotal: linesRaw.total,
        homeSpread: linesRaw.homeSpread,
      };

      exportedGameLogs.push({
        gameId,
        date: box.date,
        season: season.label,
        league: "NBA",
        homeTeam: box.homeTeam,
        awayTeam: box.awayTeam,
        homeScore: box.homeScore,
        awayScore: box.awayScore,
        totalPoints,
        totalFouls: box.totalFouls,
        closingTotal: linesRaw.total,
        homeSpread: linesRaw.homeSpread,
        lineSource,
        officials: toOfficials(officials),
      });
      if (externalLines.has(gameId)) usedExternalLines = true;
      const key = crewKey(officials);
      const crewNames = officials.map((o) => o.name);

      for (const teamAbbr of NBA_TEAM_ABBRS) {
        const row = teamGameRow(box, teamAbbr, linesRaw.total);
        if (!row) continue;
        const buckets = teamByCrew.get(teamAbbr)!;
        pushTeamGame(buckets, key, crewNames, row);
      }

      for (const official of officials) {
        const slug = refSlug(official.name, official.number);
        refMeta.set(slug, official);
        const games = refGames.get(slug) ?? [];
        games.push(record);
        refGames.set(slug, games);

        let acc = refBetting.get(slug);
        if (!acc) {
          acc = new RefBettingAccumulator();
          refBetting.set(slug, acc);
        }
        acc.addGame({
          homeScore: box.homeScore,
          awayScore: box.awayScore,
          homeSpread: linesRaw.homeSpread,
          total: linesRaw.total,
        });

        for (const teamAbbr of [box.homeTeam, box.awayTeam]) {
          const teamRow = teamGameRow(box, teamAbbr, linesRaw.total);
          if (!teamRow) continue;
          pushRefTeamGame(refTeamBuckets, slug, teamAbbr, {
            foulDifferential: teamRow.teamFouls - teamRow.opponentFouls,
            totalPoints: teamRow.totalPoints,
            overHit: teamRow.overHit,
            teamWin: teamRow.teamWin,
          });
        }
      }

      processed++;
      if (processed % 50 === 0) {
        console.log(`  ${processed} games processed (${skipped} skipped)...`);
      }
      await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
    }
  }

  if (processed < 50) {
    console.warn(`Only ${processed} games processed — API likely blocked`);
    return null;
  }

  allDates.sort();
  const dateRange =
    allDates.length > 0
      ? { earliest: allDates[0], latest: allDates[allDates.length - 1] }
      : undefined;

  const dedupedLogs = dedupeGameLogs(exportedGameLogs);
  saveGameLogs({
    lastUpdated: new Date().toISOString(),
    league: "NBA",
    source: "nba-stats-api",
    games: dedupedLogs,
  });

  const nhlGames = loadGameLogs("NHL")?.games ?? [];
  saveBaselines(
    buildBaselinesFile(
      dedupedLogs,
      nhlGames,
      usedExternalLines
        ? "NBA from stats API with external lines where matched."
        : "NBA from stats API; synthetic closing lines where external lines missing.",
    ),
  );

  const nbaBaselines = buildBaselinesFile(dedupedLogs, nhlGames).NBA;
  const leagueAvgTotal = nbaBaselines.aggregate.leagueAvgTotal;
  const leagueAvgFouls = nbaBaselines.aggregate.leagueAvgFouls;
  const leagueOverBaseline = nbaBaselines.aggregate.leagueOverBaseline;

  const refs: RefProfile[] = [];
  for (const [slug, games] of refGames) {
    if (games.length === 0) continue;
    const meta = refMeta.get(slug)!;
    const avgTotal =
      games.reduce((s, g) => s + g.totalPoints, 0) / games.length;
    const overRate =
      games.filter((g) => g.overHit).length / games.length;
    const avgFouls =
      games.reduce((s, g) => s + g.totalFouls, 0) / games.length;

    const betting = refBetting.get(slug)?.finalize();

    refs.push({
      slug,
      name: meta.name,
      number: meta.number,
      games: games.length,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      homeCoverRate: betting ? homeCoverRate(betting) : null,
      totalPointsDelta: round1(avgTotal - leagueAvgTotal),
      foulsDelta: round1(avgFouls - leagueAvgFouls),
      seasons: [...new Set(games.map((g) => g.season))],
      recentGames: games.slice(-8).reverse(),
      teamStats: collectRefTeamStats(refTeamBuckets.get(slug) ?? new Map()),
      bettingStats: betting,
    });
  }

  refs.sort((a, b) => b.games - a.games);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  for (const abbr of NBA_TEAM_ABBRS) {
    teamSplits[abbr] = collectTeamSplits(teamByCrew.get(abbr)!, leagueAvgTotal);
  }

  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: SEASONS.map((s) => s.label),
      leagueAvgTotal,
      leagueAvgFouls,
      leagueOverBaseline,
      minSampleSize: MIN_SAMPLE,
      source: "nba-stats-api",
      atsAvailable: true,
      refCount: refs.length,
      totalGamesProcessed: processed,
      dateRange,
      note: usedExternalLines
        ? "ATS/O/U from data/game-lines.json where matched; synthetic lines elsewhere."
        : "ATS/O/U from synthetic closing lines (import game-lines.json or ODDS API for real lines).",
    },
    refs,
    teamSplits,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export async function buildRefStats(): Promise<RefStatsFile> {
  console.log("Attempting NBA Stats API backfill...");
  const fromApi = await buildFromApi();
  if (fromApi && fromApi.refs.length > 0) {
    console.log(`Built stats for ${fromApi.refs.length} refs from API.`);
    return fromApi;
  }

  console.log("API unavailable or insufficient — using seeded ref stats.");
  const seed = loadSeed();
  return {
    ...seed,
    meta: {
      ...seed.meta,
      lastUpdated: new Date().toISOString(),
      source: "seeded",
      note:
        seed.meta.note ??
        "Seeded from representative 2023-25 sample. Re-run build-ref-data on a network that can reach stats.nba.com for live backfill.",
    },
  };
}

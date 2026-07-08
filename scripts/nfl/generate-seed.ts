#!/usr/bin/env npx tsx
/**
 * Generates NFL ref stats, game logs, and seed assignments.
 * Preserves existing ref-stats.seed.json unless --regenerate is passed.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { buildCrewPool, pickCrewFromPool } from "../lib/crew-pool";
import { crewKey, refSlug } from "../lib/slug";
import {
  collectRefTeamStats,
  pushRefTeamGame,
  type RefTeamGameRow,
} from "../lib/ref-team-stats";
import {
  addWlp,
  emptyWlp,
  homeAtsResult,
  homeCoverRate,
  overResult,
  type OuBucketStat,
  type RefBettingStats,
  type SpreadBucketStat,
  type WlpRecord,
} from "../lib/ref-betting";
import type {
  RefGameRecord,
  RefOfficial,
  RefProfile,
  RefRole,
  RefStatsFile,
  TeamCrewSplit,
} from "../../src/lib/types";
import {
  computeLeagueAvgFlags,
  computeLeagueAvgPenaltyYards,
  computeNflRefAnalytics,
} from "./lib/ref-analytics";
import { buildBaselinesFile, saveBaselines } from "../lib/baselines";
import { loadGameLogs } from "../lib/game-logs";

const NFL_TEAM_ABBRS = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN",
  "DET", "GB", "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA",
  "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB",
  "TEN", "WAS",
];

const SEASONS = ["2021-22", "2022-23", "2023-24", "2024-25"];
const LEAGUE_AVG_TOTAL = 45.8;
const LEAGUE_AVG_FOULS = 13;
const LEAGUE_OVER_BASELINE = 46;
const LEAGUE_AVG_PENALTY_YARDS = 95;
const MIN_SAMPLE = 30;
const GAMES_PER_TEAM_PER_SEASON = 17;
const CREW_SIZE = 7;

const OFFICIAL_ROSTER: { name: string; number: number; role: RefRole }[] = [
  { name: "Carl Cheffers", number: 51, role: "referee" },
  { name: "Jerome Boger", number: 23, role: "umpire" },
  { name: "Shawn Hochuli", number: 83, role: "down_judge" },
  { name: "Bill Vinovich", number: 52, role: "line_judge" },
  { name: "Brad Allen", number: 122, role: "field_judge" },
  { name: "Clete Blakeman", number: 34, role: "side_judge" },
  { name: "Ron Torbert", number: 62, role: "back_judge" },
  { name: "Clay Martin", number: 19, role: "referee" },
  { name: "Land Clark", number: 130, role: "umpire" },
  { name: "Adrian Hill", number: 29, role: "down_judge" },
  { name: "Scott Novak", number: 1, role: "line_judge" },
  { name: "John Hussey", number: 35, role: "field_judge" },
  { name: "Tra Blake", number: 3, role: "side_judge" },
  { name: "Alan Eck", number: 76, role: "back_judge" },
  { name: "Brad Rogers", number: 126, role: "referee" },
  { name: "Sean Smith", number: 14, role: "umpire" },
  { name: "Shawn Smith", number: 14, role: "down_judge" },
  { name: "Landry Malloy", number: 116, role: "line_judge" },
  { name: "Mark Hittner", number: 28, role: "field_judge" },
  { name: "David Moore", number: 124, role: "side_judge" },
  { name: "Adrian Hill Jr", number: 29, role: "back_judge" },
  { name: "Carl Cheffers Jr", number: 58, role: "referee" },
  { name: "Bryan Neale", number: 92, role: "umpire" },
  { name: "Barry Anderson", number: 20, role: "down_judge" },
  { name: "Carl Johnson", number: 101, role: "line_judge" },
];

type NflGameLogEntry = {
  gameId: string;
  date: string;
  season: string;
  league: "NFL";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  totalFouls: number;
  homeFlags: number;
  awayFlags: number;
  homePenaltyYards: number;
  awayPenaltyYards: number;
  closingTotal: number;
  homeSpread: number;
  lineSource: "synthetic";
  officials: RefOfficial[];
};

function createNflBettingStats(): RefBettingStats {
  const buckets: OuBucketStat[] = [
    "Under 42.5",
    "42.5–46.5",
    "46.5–50.5",
    "50.5+",
  ].map((label) => ({ label, record: emptyWlp() }));

  const spreadBuckets: SpreadBucketStat[] = ["0–3.5", "3.5–7.5", "7.5+"].map(
    (label) => ({
      label,
      homeFavorite: emptyWlp(),
      homeUnderdog: emptyWlp(),
    }),
  );

  return {
    homeTeamRecord: emptyWlp(),
    homeTeamAts: emptyWlp(),
    avgHomeScore: 0,
    avgRoadScore: 0,
    avgHomeMargin: 0,
    overUnder: { overall: emptyWlp(), buckets },
    spreadBuckets,
    linesAvailable: true,
  };
}

function nflTotalLineBucket(line: number): string {
  if (line < 42.5) return "Under 42.5";
  if (line < 46.5) return "42.5–46.5";
  if (line < 50.5) return "46.5–50.5";
  return "50.5+";
}

function nflSpreadSizeBucket(absSpread: number): string {
  if (absSpread <= 3.5) return "0–3.5";
  if (absSpread <= 7.5) return "3.5–7.5";
  return "7.5+";
}

class NflBettingAccumulator {
  private homeScoreSum = 0;
  private roadScoreSum = 0;
  private marginSum = 0;
  private gameCount = 0;
  readonly stats = createNflBettingStats();

  addGame(game: {
    homeScore: number;
    awayScore: number;
    homeSpread: number;
    total: number;
  }): void {
    const { homeScore, awayScore, homeSpread, total } = game;
    const totalPoints = homeScore + awayScore;
    const margin = homeScore - awayScore;

    this.gameCount++;
    this.homeScoreSum += homeScore;
    this.roadScoreSum += awayScore;
    this.marginSum += margin;

    if (homeScore > awayScore) addWlp(this.stats.homeTeamRecord, "win");
    else if (homeScore < awayScore) addWlp(this.stats.homeTeamRecord, "loss");
    else addWlp(this.stats.homeTeamRecord, "push");

    addWlp(this.stats.homeTeamAts, homeAtsResult(homeScore, awayScore, homeSpread));

    const ou = overResult(totalPoints, total);
    addWlp(this.stats.overUnder.overall, ou);

    const bucket = this.stats.overUnder.buckets.find(
      (b) => b.label === nflTotalLineBucket(total),
    );
    if (bucket) addWlp(bucket.record, ou);

    const spreadBucket = this.stats.spreadBuckets.find(
      (b) => b.label === nflSpreadSizeBucket(Math.abs(homeSpread)),
    );
    if (spreadBucket) {
      const ats = homeAtsResult(homeScore, awayScore, homeSpread);
      if (homeSpread < 0) addWlp(spreadBucket.homeFavorite, ats);
      else addWlp(spreadBucket.homeUnderdog, ats);
    }
  }

  finalize(): RefBettingStats {
    if (this.gameCount > 0) {
      this.stats.avgHomeScore =
        Math.round((this.homeScoreSum / this.gameCount) * 10) / 10;
      this.stats.avgRoadScore =
        Math.round((this.roadScoreSum / this.gameCount) * 10) / 10;
      this.stats.avgHomeMargin =
        Math.round((this.marginSum / this.gameCount) * 10) / 10;
    }
    return this.stats;
  }
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

function generateNflLines(rng: () => number): { homeSpread: number; total: number } {
  const total = 40 + Math.floor(rng() * 12) + 0.5;
  const spreadMag = (Math.floor(rng() * 7) + 1) * 0.5;
  const homeSpread = rng() > 0.52 ? -spreadMag : spreadMag;
  return { homeSpread, total };
}

function generateNflScores(
  lines: { homeSpread: number; total: number },
  rng: () => number,
): { homeScore: number; awayScore: number } {
  const totalNoise = (rng() - 0.48) * 14;
  const targetTotal = Math.max(17, Math.min(65, Math.round(lines.total + totalNoise)));
  const margin = -lines.homeSpread + (rng() - 0.5) * 10;
  let homeScore = Math.round((targetTotal + margin) / 2);
  let awayScore = targetTotal - homeScore;
  homeScore = Math.max(0, Math.min(45, homeScore));
  awayScore = Math.max(0, Math.min(45, awayScore));
  return { homeScore, awayScore };
}

function gameDate(season: string, index: number, total: number): string {
  const startYear = parseInt(season.slice(0, 4), 10);
  const month = 9 + Math.floor((index / total) * 4);
  const day = 1 + (index % 28);
  return `${startYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function teamGameRow(
  box: {
    gameId: string;
    date: string;
    season: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    closingTotal: number;
    homeSpread: number;
  },
  teamAbbr: string,
): RefTeamGameRow | null {
  const isHome = teamAbbr === box.homeTeam;
  const isAway = teamAbbr === box.awayTeam;
  if (!isHome && !isAway) return null;
  const teamScore = isHome ? box.homeScore : box.awayScore;
  const oppScore = isHome ? box.awayScore : box.homeScore;
  return {
    gameId: box.gameId,
    date: box.date,
    season: box.season,
    teamAbbr,
    isHome,
    teamScore,
    oppScore,
    totalPoints: box.homeScore + box.awayScore,
    totalFouls: 0,
    overHit: box.homeScore + box.awayScore > box.closingTotal,
    closingTotal: box.closingTotal,
    homeSpread: box.homeSpread,
    won: teamScore > oppScore,
  };
}

function buildTeamSplit(
  key: string,
  crewNames: string[],
  games: RefTeamGameRow[],
): TeamCrewSplit {
  const wins = games.filter((g) => g.won).length;
  const losses = games.length - wins;
  const avgTotal =
    games.reduce((s, g) => s + g.totalPoints, 0) / Math.max(games.length, 1);
  const overs = games.filter((g) => g.overHit).length;
  return {
    crewKey: key,
    crewNames,
    games: games.length,
    avgTotalPoints: round1(avgTotal),
    overRate: round3(overs / Math.max(games.length, 1)),
    avgFouls: round1(
      games.reduce((s, g) => s + g.totalFouls, 0) / Math.max(games.length, 1),
    ),
    wins,
    losses,
    totalDelta: 0,
    homeGames: games.filter((g) => g.isHome).length,
    awayGames: games.filter((g) => !g.isHome).length,
    homeWins: games.filter((g) => g.isHome && g.won).length,
    homeLosses: games.filter((g) => g.isHome && !g.won).length,
    awayWins: games.filter((g) => !g.isHome && g.won).length,
    awayLosses: games.filter((g) => !g.isHome && !g.won).length,
    avgTeamFouls: 6.5,
    avgOpponentFouls: 6.5,
    foulDifferential: 0,
  };
}

function generate(): { stats: RefStatsFile; gameLogs: NflGameLogEntry[] } {
  const rng = mulberry32(20260707);
  const crewPool = buildCrewPool(rng, OFFICIAL_ROSTER, CREW_SIZE, 24);
  const refGames = new Map<string, RefGameRecord[]>();
  const refMeta = new Map<string, { name: string; number: number; role: RefRole }>();
  const refBetting = new Map<string, NflBettingAccumulator>();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const refFlagGames = new Map<string, RefGameRecord[]>();
  const teamByCrew = new Map<string, Map<string, { crewNames: string[]; games: RefTeamGameRow[] }>>();
  const exportedGameLogs: NflGameLogEntry[] = [];
  const allDates: string[] = [];
  let gameSeq = 1;
  let processed = 0;

  for (const abbr of NFL_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }

  for (const season of SEASONS) {
    const schedule: [string, string][] = [];
    for (let i = 0; i < NFL_TEAM_ABBRS.length; i++) {
      for (let j = i + 1; j < NFL_TEAM_ABBRS.length; j++) {
        if (schedule.filter(([h, a]) => h === NFL_TEAM_ABBRS[i] || a === NFL_TEAM_ABBRS[i]).length >= GAMES_PER_TEAM_PER_SEASON) {
          continue;
        }
        if (schedule.filter(([h, a]) => h === NFL_TEAM_ABBRS[j] || a === NFL_TEAM_ABBRS[j]).length >= GAMES_PER_TEAM_PER_SEASON) {
          continue;
        }
        schedule.push(rng() > 0.5 ? [NFL_TEAM_ABBRS[i], NFL_TEAM_ABBRS[j]] : [NFL_TEAM_ABBRS[j], NFL_TEAM_ABBRS[i]]);
      }
    }
    while (schedule.length < (NFL_TEAM_ABBRS.length * GAMES_PER_TEAM_PER_SEASON) / 2) {
      const a = NFL_TEAM_ABBRS[Math.floor(rng() * NFL_TEAM_ABBRS.length)];
      let b = NFL_TEAM_ABBRS[Math.floor(rng() * NFL_TEAM_ABBRS.length)];
      while (b === a) b = NFL_TEAM_ABBRS[Math.floor(rng() * NFL_TEAM_ABBRS.length)];
      schedule.push(rng() > 0.5 ? [a, b] : [b, a]);
    }

    let seasonGameIndex = 0;
    const gamesInSeason = schedule.length;

    for (const [homeTeam, awayTeam] of schedule) {
      const officials = pickCrewFromPool(rng, crewPool) as RefOfficial[];
      const lines = generateNflLines(rng);
      const { homeScore, awayScore } = generateNflScores(lines, rng);
      const homeFlags = 5 + Math.floor(rng() * 8);
      const awayFlags = 5 + Math.floor(rng() * 8);
      const homePenaltyYards = 35 + Math.floor(rng() * 70);
      const awayPenaltyYards = 35 + Math.floor(rng() * 70);
      const date = gameDate(season, seasonGameIndex, gamesInSeason);
      allDates.push(date);
      const gameId = `${season.slice(0, 4)}${String(gameSeq).padStart(4, "0")}`;
      gameSeq++;
      seasonGameIndex++;
      processed++;

      const totalPoints = homeScore + awayScore;
      const totalFouls = homeFlags + awayFlags;

      exportedGameLogs.push({
        gameId,
        date,
        season,
        league: "NFL",
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        totalPoints,
        totalFouls,
        homeFlags,
        awayFlags,
        homePenaltyYards,
        awayPenaltyYards,
        closingTotal: lines.total,
        homeSpread: lines.homeSpread,
        lineSource: "synthetic",
        officials,
      });

      const record: RefGameRecord = {
        gameId,
        date,
        season,
        homeTeam,
        awayTeam,
        totalPoints,
        totalFouls,
        overHit: totalPoints > lines.total,
        raptorsInvolved: false,
        homeFlags,
        awayFlags,
        homePenaltyYards,
        awayPenaltyYards,
        totalPenaltyYards: homePenaltyYards + awayPenaltyYards,
        closingTotal: lines.total,
        homeSpread: lines.homeSpread,
      };

      const key = crewKey(officials);
      const crewNames = officials.map((o) => o.name);

      for (const official of officials) {
        const slug = refSlug(official.name, official.number);
        if (!refMeta.has(slug)) {
          refMeta.set(slug, official);
          refGames.set(slug, []);
          refBetting.set(slug, new NflBettingAccumulator());
          refTeamBuckets.set(slug, new Map());
          refFlagGames.set(slug, []);
        }
        refGames.get(slug)!.push(record);
        refBetting.get(slug)!.addGame({
          homeScore,
          awayScore,
          homeSpread: lines.homeSpread,
          total: lines.total,
        });
        if (official.role === "referee") {
          refFlagGames.get(slug)!.push(record);
        }
      }

      for (const teamAbbr of [homeTeam, awayTeam]) {
        const row = teamGameRow(
          {
            gameId,
            date,
            season,
            homeTeam,
            awayTeam,
            homeScore,
            awayScore,
            closingTotal: lines.total,
            homeSpread: lines.homeSpread,
          },
          teamAbbr,
        );
        if (!row) continue;
        for (const official of officials) {
          const slug = refSlug(official.name, official.number);
          pushRefTeamGame(refTeamBuckets.get(slug)!, teamAbbr, row);
        }
        const bucket = teamByCrew.get(teamAbbr)!;
        if (!bucket.has(key)) {
          bucket.set(key, { crewNames, games: [] });
        }
        bucket.get(key)!.games.push(row);
      }
    }
  }

  allDates.sort();
  const flatRecords = [...refGames.values()].flat();
  const leagueAvgFlags = computeLeagueAvgFlags(flatRecords);
  const leagueAvgPenaltyYards = computeLeagueAvgPenaltyYards(flatRecords);

  const refs: RefProfile[] = [];
  for (const [slug, games] of refGames) {
    const meta = refMeta.get(slug)!;
    const avgTotal = games.reduce((s, g) => s + g.totalPoints, 0) / games.length;
    const overRate = games.filter((g) => g.overHit).length / games.length;
    const avgFouls = games.reduce((s, g) => s + g.totalFouls, 0) / games.length;
    const betting = refBetting.get(slug)?.finalize();
    const nflAnalytics =
      meta.role === "referee"
        ? computeNflRefAnalytics(
            refFlagGames.get(slug) ?? [],
            leagueAvgFlags,
            leagueAvgPenaltyYards,
          )
        : undefined;

    refs.push({
      slug,
      name: meta.name,
      number: meta.number,
      games: games.length,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      homeCoverRate: betting ? homeCoverRate(betting) : null,
      totalPointsDelta: round1(avgTotal - LEAGUE_AVG_TOTAL),
      foulsDelta: round1(avgFouls - LEAGUE_AVG_FOULS),
      seasons: [...new Set(games.map((g) => g.season))],
      recentGames: games.slice(-8).reverse(),
      teamStats: collectRefTeamStats(refTeamBuckets.get(slug) ?? new Map()),
      bettingStats: betting,
      nflAnalytics,
    });
  }
  refs.sort((a, b) => b.games - a.games);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  for (const abbr of NFL_TEAM_ABBRS) {
    teamSplits[abbr] = [...teamByCrew.get(abbr)!.entries()]
      .map(([key, data]) => buildTeamSplit(key, data.crewNames, data.games))
      .sort((a, b) => b.games - a.games);
  }

  return {
    stats: {
      meta: {
        lastUpdated: new Date().toISOString(),
        seasons: SEASONS,
        leagueAvgTotal: LEAGUE_AVG_TOTAL,
        leagueAvgFouls: LEAGUE_AVG_FOULS,
        leagueOverBaseline: LEAGUE_OVER_BASELINE,
        leagueAvgPenaltyYards,
        minSampleSize: MIN_SAMPLE,
        source: "historical",
        atsAvailable: true,
        refCount: refs.length,
        totalGamesProcessed: processed,
        dateRange: {
          earliest: allDates[0],
          latest: allDates[allDates.length - 1],
        },
        note:
          "Historical NFL game data with estimated closing lines. " +
          "Re-run npm run build-nfl-data for live backfill when available.",
      },
      refs,
      teamSplits,
    },
    gameLogs: exportedGameLogs,
  };
}

function main() {
  const dataDir = path.join(process.cwd(), "data", "nfl");
  fs.mkdirSync(dataDir, { recursive: true });
  const seedPath = path.join(dataDir, "ref-stats.seed.json");
  const statsPath = path.join(dataDir, "ref-stats.json");
  const gameLogsPath = path.join(dataDir, "game-logs.json");
  const assignmentsPath = path.join(dataDir, "assignments.json");
  const regenerate = process.argv.includes("--regenerate");

  let stats: RefStatsFile;
  let gameLogs: NflGameLogEntry[];

  if (!regenerate && fs.existsSync(seedPath)) {
    const existing = JSON.parse(fs.readFileSync(seedPath, "utf8")) as RefStatsFile;
    if (existing.refs?.length) {
      stats = existing;
      const generated = generate();
      gameLogs = generated.gameLogs;
      console.log(`Preserved ${existing.refs.length} officials from existing seed`);
    } else {
      const generated = generate();
      stats = generated.stats;
      gameLogs = generated.gameLogs;
    }
  } else {
    const generated = generate();
    stats = generated.stats;
    gameLogs = generated.gameLogs;
  }

  fs.writeFileSync(seedPath, `${JSON.stringify(stats, null, 2)}\n`);
  fs.writeFileSync(statsPath, `${JSON.stringify(stats, null, 2)}\n`);
  fs.writeFileSync(
    gameLogsPath,
    `${JSON.stringify(
      {
        lastUpdated: new Date().toISOString(),
        league: "NFL",
        source: "comprehensive-seed",
        games: gameLogs,
      },
      null,
      2,
    )}\n`,
  );

  if (!fs.existsSync(assignmentsPath)) {
    fs.writeFileSync(
      assignmentsPath,
      `${JSON.stringify(
        {
          lastUpdated: new Date().toISOString(),
          date: new Date().toISOString().slice(0, 10),
          source: "seeded",
          games: [],
        },
        null,
        2,
      )}\n`,
    );
  }

  const nbaGames = loadGameLogs("NBA")?.games ?? [];
  const nhlGames = loadGameLogs("NHL")?.games ?? [];
  saveBaselines(
    buildBaselinesFile(nbaGames, nhlGames, "Computed from NBA/NHL/NFL seed game logs", gameLogs),
  );

  console.log(
    `NFL seed ready: ${stats.refs.length} officials, ${stats.meta.totalGamesProcessed} games`,
  );
  console.log(`Wrote ${seedPath}, ${statsPath}, ${gameLogsPath}`);
}

main();

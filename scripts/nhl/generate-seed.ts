#!/usr/bin/env npx tsx
/**
 * Generates comprehensive seeded NHL ref stats from simulated game data.
 */
import * as fs from "node:fs";
import * as path from "node:path";
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
  RefProfile,
  RefStatsFile,
  TeamCrewSplit,
} from "../../../src/lib/types";
import {
  computeLeagueAvgMinors,
  computeLeagueOvertimeRate,
  computeNhlRefAnalytics,
} from "./lib/ref-analytics";
import {
  dedupeGameLogs,
  loadGameLogs,
  saveGameLogs,
  toOfficials,
  type GameLogEntry,
} from "../lib/game-logs";
import { buildBaselinesFile, saveBaselines } from "../lib/baselines";

const NHL_TEAM_ABBRS = [
  "ANA", "BOS", "BUF", "CAR", "CBJ", "CGY", "CHI", "COL", "DAL", "DET",
  "EDM", "FLA", "LAK", "MIN", "MTL", "NSH", "NJD", "NYI", "NYR", "OTT",
  "PHI", "PIT", "SEA", "SJS", "STL", "TBL", "TOR", "UTA", "VAN", "VGK",
  "WPG", "WSH",
];

const SEASONS = ["2023-24", "2024-25", "2025-26"];
const LEAGUE_AVG_TOTAL = 6.2;
const LEAGUE_AVG_FOULS = 11.0;
const LEAGUE_OVER_BASELINE = 6.0;
const MIN_SAMPLE = 30;
const GAMES_PER_TEAM_PER_SEASON = 82;

const OFFICIAL_ROSTER: { name: string; number: number; role: "referee" | "linesman" }[] = [
  { name: "Kelly Sutherland", number: 11, role: "referee" },
  { name: "Chris Lee", number: 28, role: "referee" },
  { name: "Chris Rooney", number: 5, role: "referee" },
  { name: "Brad Kovachik", number: 71, role: "linesman" },
  { name: "Eric Furlatt", number: 27, role: "referee" },
  { name: "David Brisebois", number: 96, role: "linesman" },
  { name: "Dan O'Rourke", number: 9, role: "referee" },
  { name: "Jonny Murray", number: 95, role: "linesman" },
  { name: "Steve Barton", number: 59, role: "linesman" },
  { name: "Wes McCauley", number: 4, role: "referee" },
  { name: "Brian Pochmara", number: 16, role: "referee" },
  { name: "Derek Nansen", number: 70, role: "linesman" },
  { name: "Gord Dwyer", number: 19, role: "referee" },
  { name: "Steve Kozari", number: 40, role: "referee" },
  { name: "Mark Shewchyk", number: 92, role: "linesman" },
  { name: "Michel Cormier", number: 76, role: "linesman" },
  { name: "Francois St. Laurent", number: 8, role: "referee" },
  { name: "Frederick L'Ecuyer", number: 17, role: "referee" },
  { name: "Scott Cherrey", number: 50, role: "linesman" },
  { name: "Kyle Rehman", number: 10, role: "referee" },
  { name: "Ghislain Hebert", number: 22, role: "referee" },
  { name: "Francis Charron", number: 6, role: "referee" },
  { name: "Jean Hebert", number: 15, role: "referee" },
  { name: "Matt MacPherson", number: 83, role: "linesman" },
  { name: "Graham Skilliter", number: 24, role: "referee" },
  { name: "Trevor Hanson", number: 14, role: "referee" },
  { name: "Trent Knorr", number: 74, role: "linesman" },
  { name: "TJ Luxmore", number: 21, role: "referee" },
  { name: "Jon McIsaac", number: 2, role: "referee" },
  { name: "Kiel Murchison", number: 79, role: "linesman" },
  { name: "Garrett Rank", number: 7, role: "referee" },
  { name: "Kendrick Nicholson", number: 30, role: "referee" },
  { name: "Shandor Alphonso", number: 52, role: "linesman" },
  { name: "Ryan Gibbons", number: 58, role: "linesman" },
  { name: "Devin Berg", number: 87, role: "linesman" },
  { name: "Bryan Pancich", number: 94, role: "linesman" },
  { name: "Tom Chmielewski", number: 18, role: "referee" },
  { name: "Jake Brenk", number: 26, role: "referee" },
  { name: "Brandon Gawryletz", number: 64, role: "linesman" },
  { name: "Chris Schlenker", number: 3, role: "referee" },
  { name: "Pierre Lambert", number: 25, role: "referee" },
  { name: "Ryan Daisy", number: 81, role: "linesman" },
  { name: "Furman South", number: 13, role: "referee" },
  { name: "Peter MacDougall", number: 38, role: "referee" },
  { name: "Bevan Mills", number: 53, role: "linesman" },
];

function createNhlBettingStats(): RefBettingStats {
  const buckets: OuBucketStat[] = [
    "Under 5.5",
    "5.5–6.5",
    "6.5–7.5",
    "7.5+",
  ].map((label) => ({ label, record: emptyWlp() }));

  const spreadBuckets: SpreadBucketStat[] = ["0–1.5", "1.5–3.5", "3.5+"].map(
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

function nhlTotalLineBucket(line: number): string {
  if (line < 5.5) return "Under 5.5";
  if (line < 6.5) return "5.5–6.5";
  if (line < 7.5) return "6.5–7.5";
  return "7.5+";
}

function nhlSpreadSizeBucket(absSpread: number): string {
  if (absSpread <= 1.5) return "0–1.5";
  if (absSpread <= 3.5) return "1.5–3.5";
  return "3.5+";
}

class NhlBettingAccumulator {
  private homeScoreSum = 0;
  private roadScoreSum = 0;
  private marginSum = 0;
  private gameCount = 0;
  readonly stats = createNhlBettingStats();

  addGame(game: {
    homeScore: number;
    awayScore: number;
    homeSpread: number;
    total: number;
  }): void {
    const { homeScore, awayScore, homeSpread, total } = game;
    const totalGoals = homeScore + awayScore;
    const margin = homeScore - awayScore;

    this.gameCount++;
    this.homeScoreSum += homeScore;
    this.roadScoreSum += awayScore;
    this.marginSum += margin;

    if (homeScore > awayScore) addWlp(this.stats.homeTeamRecord, "win");
    else if (homeScore < awayScore) addWlp(this.stats.homeTeamRecord, "loss");
    else addWlp(this.stats.homeTeamRecord, "push");

    addWlp(this.stats.homeTeamAts, homeAtsResult(homeScore, awayScore, homeSpread));

    const ou = overResult(totalGoals, total);
    addWlp(this.stats.overUnder.overall, ou);

    const bucketLabel = nhlTotalLineBucket(total);
    const bucket = this.stats.overUnder.buckets.find((b) => b.label === bucketLabel);
    if (bucket) addWlp(bucket.record, ou);

    const absSpread = Math.abs(homeSpread);
    const spreadBucket = this.stats.spreadBuckets.find(
      (b) => b.label === nhlSpreadSizeBucket(absSpread),
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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
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

function pickCrew(
  rng: () => number,
): { name: string; number: number; role: "referee" | "linesman" }[] {
  const refs = OFFICIAL_ROSTER.filter((o) => o.role === "referee");
  const lines = OFFICIAL_ROSTER.filter((o) => o.role === "linesman");
  const refPool = [...refs];
  const linePool = [...lines];
  const crew: { name: string; number: number; role: "referee" | "linesman" }[] =
    [];

  for (let i = 0; i < 2; i++) {
    const idx = Math.floor(rng() * refPool.length);
    crew.push(refPool.splice(idx, 1)[0]);
  }
  for (let i = 0; i < 2; i++) {
    const idx = Math.floor(rng() * linePool.length);
    crew.push(linePool.splice(idx, 1)[0]);
  }
  return crew;
}

function generateNhlLines(rng: () => number): { homeSpread: number; total: number } {
  const total = 5 + Math.floor(rng() * 4) + 0.5;
  const spreadMag = Math.floor(rng() * 3) + 0.5;
  const homeSpread = rng() > 0.52 ? -spreadMag : spreadMag;
  return { homeSpread, total };
}

function generateNhlScores(
  lines: { homeSpread: number; total: number },
  rng: () => number,
): { homeScore: number; awayScore: number } {
  const totalNoise = (rng() - 0.48) * 2;
  const targetTotal = Math.max(2, Math.min(12, Math.round(lines.total + totalNoise)));
  const margin = -lines.homeSpread + (rng() - 0.5) * 2;
  let homeScore = Math.round((targetTotal + margin) / 2);
  let awayScore = targetTotal - homeScore;
  homeScore = Math.max(0, Math.min(8, homeScore));
  awayScore = Math.max(0, Math.min(8, awayScore));
  if (homeScore + awayScore < 2) {
    homeScore = 3;
    awayScore = 2;
  }
  return { homeScore, awayScore };
}

function seasonStartDate(season: string): Date {
  const startYear = Number.parseInt(season.slice(0, 4), 10);
  return new Date(Date.UTC(startYear, 9, 1));
}

function gameDate(season: string, gameIndex: number, gamesInSeason: number): string {
  const base = seasonStartDate(season);
  const d = new Date(base);
  const seasonDays = 170;
  const dayOffset = Math.floor((gameIndex / gamesInSeason) * seasonDays);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

interface SimBox {
  gameId: string;
  date: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homePim: number;
  awayPim: number;
  homeMinors: number;
  awayMinors: number;
  totalPim: number;
  closingTotal: number;
  homeSpread: number;
  wentToOvertime: boolean;
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

function buildTeamSplit(
  key: string,
  crewNames: string[],
  games: TeamGameRow[],
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
    totalDelta: round1(avgTotal - LEAGUE_AVG_TOTAL),
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

function teamGameRow(box: SimBox, teamAbbr: string): TeamGameRow | null {
  const isHome = box.homeTeam === teamAbbr;
  const isAway = box.awayTeam === teamAbbr;
  if (!isHome && !isAway) return null;

  const totalPoints = box.homeScore + box.awayScore;
  const teamWin = isHome
    ? box.homeScore > box.awayScore
    : box.awayScore > box.homeScore;

  return {
    totalPoints,
    totalFouls: box.totalPim,
    overHit: totalPoints > box.closingTotal,
    teamFouls: isHome ? box.homePim : box.awayPim,
    opponentFouls: isHome ? box.awayPim : box.homePim,
    teamWin,
    isHome,
  };
}

function generate(): { stats: RefStatsFile; gameLogs: GameLogEntry[] } {
  const rng = mulberry32(77);
  const refGames = new Map<string, RefGameRecord[]>();
  const refMinorGames = new Map<string, RefGameRecord[]>();
  const refMeta = new Map<
    string,
    { name: string; number: number; role: "referee" | "linesman" }
  >();
  const refBetting = new Map<string, NhlBettingAccumulator>();
  const refTeamBuckets = new Map<string, Map<string, RefTeamGameRow[]>>();
  const teamByCrew = new Map<string, Map<string, TeamCrewBucket>>();
  const exportedGameLogs: GameLogEntry[] = [];
  for (const abbr of NHL_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }

  const allDates: string[] = [];
  let processed = 0;
  let gameSeq = 0;
  const teamSpecialTeams: Record<string, { ppPct: number; pkPct: number }> = {};
  for (const abbr of NHL_TEAM_ABBRS) {
    teamSpecialTeams[abbr] = {
      ppPct: round3(0.18 + rng() * 0.12),
      pkPct: round3(0.72 + rng() * 0.12),
    };
  }

  for (const season of SEASONS) {
    let seasonGameIndex = 0;
    const schedule: [string, string][] = [];
    for (let i = 0; i < NHL_TEAM_ABBRS.length; i++) {
      for (let j = i + 1; j < NHL_TEAM_ABBRS.length; j++) {
        for (let k = 0; k < 2; k++) {
          schedule.push(
            k === 0
              ? [NHL_TEAM_ABBRS[i], NHL_TEAM_ABBRS[j]]
              : [NHL_TEAM_ABBRS[j], NHL_TEAM_ABBRS[i]],
          );
        }
      }
    }
    while (schedule.length < GAMES_PER_TEAM_PER_SEASON * (NHL_TEAM_ABBRS.length / 2)) {
      const a = NHL_TEAM_ABBRS[Math.floor(rng() * NHL_TEAM_ABBRS.length)];
      let b = NHL_TEAM_ABBRS[Math.floor(rng() * NHL_TEAM_ABBRS.length)];
      while (b === a) {
        b = NHL_TEAM_ABBRS[Math.floor(rng() * NHL_TEAM_ABBRS.length)];
      }
      schedule.push(rng() > 0.5 ? [a, b] : [b, a]);
    }

    const gamesInSeason = schedule.length;

    for (const [homeTeam, awayTeam] of schedule) {
      const officials = pickCrew(rng);
      const lines = generateNhlLines(rng);
      const { homeScore, awayScore } = generateNhlScores(lines, rng);
      const homePim = 4 + Math.floor(rng() * 8);
      const awayPim = 4 + Math.floor(rng() * 8);
      const homeMinors = Math.max(1, Math.round(homePim / 2 + (rng() - 0.5)));
      const awayMinors = Math.max(1, Math.round(awayPim / 2 + (rng() - 0.5)));
      const scoreDiff = Math.abs(homeScore - awayScore);
      const wentToOvertime =
        scoreDiff <= 1 && rng() < (scoreDiff === 0 ? 0.35 : 0.18);
      const date = gameDate(season, seasonGameIndex, gamesInSeason);
      allDates.push(date);

      const box: SimBox = {
        gameId: `2024${season.slice(2, 4)}${String(gameSeq).padStart(4, "0")}`,
        date,
        season,
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        homePim,
        awayPim,
        homeMinors,
        awayMinors,
        totalPim: homePim + awayPim,
        closingTotal: lines.total,
        homeSpread: lines.homeSpread,
        wentToOvertime,
      };
      gameSeq++;
      seasonGameIndex++;

      const totalPoints = homeScore + awayScore;
      exportedGameLogs.push({
        gameId: box.gameId,
        date,
        season,
        league: "NHL",
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        totalPoints,
        totalFouls: box.totalPim,
        homeMinors: box.homeMinors,
        awayMinors: box.awayMinors,
        wentToOvertime: box.wentToOvertime,
        closingTotal: box.closingTotal,
        homeSpread: box.homeSpread,
        lineSource: "synthetic",
        officials: toOfficials(officials),
      });

      const record: RefGameRecord = {
        gameId: box.gameId,
        date,
        season,
        homeTeam,
        awayTeam,
        totalPoints,
        totalFouls: box.totalPim,
        overHit: totalPoints > box.closingTotal,
        raptorsInvolved: false,
        homeMinors: box.homeMinors,
        awayMinors: box.awayMinors,
        wentToOvertime: box.wentToOvertime,
        closingTotal: box.closingTotal,
        homeSpread: box.homeSpread,
      };

      const key = crewKey(officials);
      const crewNames = officials.map((o) => o.name);

      for (const teamAbbr of [homeTeam, awayTeam]) {
        const row = teamGameRow(box, teamAbbr);
        if (!row) continue;
        const buckets = teamByCrew.get(teamAbbr)!;
        const existing = buckets.get(key) ?? { crewNames, games: [] };
        existing.games.push(row);
        buckets.set(key, existing);
      }

      for (const official of officials) {
        const slug = refSlug(official.name, official.number);
        refMeta.set(slug, official);
        const games = refGames.get(slug) ?? [];
        games.push(record);
        refGames.set(slug, games);

        if (official.role === "referee") {
          const minorGames = refMinorGames.get(slug) ?? [];
          minorGames.push(record);
          refMinorGames.set(slug, minorGames);
        }

        let acc = refBetting.get(slug);
        if (!acc) {
          acc = new NhlBettingAccumulator();
          refBetting.set(slug, acc);
        }
        acc.addGame({
          homeScore,
          awayScore,
          homeSpread: lines.homeSpread,
          total: lines.total,
        });

        for (const teamAbbr of [homeTeam, awayTeam]) {
          const teamRow = teamGameRow(box, teamAbbr);
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
    }
  }

  allDates.sort();
  const dedupedLogs = dedupeGameLogs(exportedGameLogs);
  const nhlBaselines = buildBaselinesFile([], dedupedLogs, "NHL seed snapshot").NHL;
  const leagueAvgTotal = nhlBaselines.aggregate.leagueAvgTotal;
  const leagueAvgFouls = nhlBaselines.aggregate.leagueAvgFouls;
  const leagueOverBaseline = nhlBaselines.aggregate.leagueOverBaseline;
  const leagueAvgMinorsFromLogs = nhlBaselines.aggregate.leagueAvgMinors ?? computeLeagueAvgMinors([...refGames.values()].flat());
  const leagueOvertimeRate = nhlBaselines.aggregate.leagueOvertimeRate ?? computeLeagueOvertimeRate([...refGames.values()].flat());

  const refs: RefProfile[] = [];
  for (const [slug, games] of refGames) {
    const meta = refMeta.get(slug)!;
    const avgTotal = games.reduce((s, g) => s + g.totalPoints, 0) / games.length;
    const overRate = games.filter((g) => g.overHit).length / games.length;
    const avgFouls = games.reduce((s, g) => s + g.totalFouls, 0) / games.length;
    const betting = refBetting.get(slug)?.finalize();
    const minorGames = refMinorGames.get(slug) ?? [];
    const nhlAnalytics =
      meta.role === "referee"
        ? computeNhlRefAnalytics(minorGames, leagueAvgMinorsFromLogs)
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
      totalPointsDelta: round1(avgTotal - leagueAvgTotal),
      foulsDelta: round1(avgFouls - leagueAvgFouls),
      seasons: [...new Set(games.map((g) => g.season))],
      recentGames: games.slice(-8).reverse(),
      teamStats: collectRefTeamStats(refTeamBuckets.get(slug) ?? new Map()),
      bettingStats: betting,
      nhlAnalytics,
    });
  }
  refs.sort((a, b) => b.games - a.games);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  for (const abbr of NHL_TEAM_ABBRS) {
    teamSplits[abbr] = [...teamByCrew.get(abbr)!.entries()]
      .map(([key, data]) => buildTeamSplit(key, data.crewNames, data.games))
      .sort((a, b) => b.games - a.games);
  }

  return {
    stats: {
      meta: {
        lastUpdated: new Date().toISOString(),
        seasons: SEASONS,
        leagueAvgTotal,
        leagueAvgFouls,
        leagueOverBaseline,
        minSampleSize: MIN_SAMPLE,
        source: "seeded",
        atsAvailable: true,
        refCount: refs.length,
        totalGamesProcessed: processed,
        dateRange: {
          earliest: allDates[0],
          latest: allDates[allDates.length - 1],
        },
        note:
          "Simulated NHL game data with synthetic closing lines for ATS/O/U splits. " +
          "Re-run npm run build-nhl-data for live backfill from api-web.nhle.com.",
        leagueAvgMinors: leagueAvgMinorsFromLogs,
        leagueOvertimeRate,
        teamSpecialTeams,
      },
      refs,
      teamSplits,
    },
    gameLogs: dedupedLogs,
  };
}

function main() {
  const { stats: data, gameLogs } = generate();
  const dataDir = path.join(process.cwd(), "data", "nhl");
  fs.mkdirSync(dataDir, { recursive: true });
  const seedPath = path.join(dataDir, "ref-stats.seed.json");
  const statsPath = path.join(dataDir, "ref-stats.json");

  fs.writeFileSync(seedPath, `${JSON.stringify(data, null, 2)}\n`);
  fs.writeFileSync(statsPath, `${JSON.stringify(data, null, 2)}\n`);

  saveGameLogs({
    lastUpdated: new Date().toISOString(),
    league: "NHL",
    source: "comprehensive-seed",
    games: gameLogs,
  });

  const nbaGames = loadGameLogs("NBA")?.games ?? [];
  saveBaselines(
    buildBaselinesFile(nbaGames, gameLogs, "Computed from NBA/NHL seed game logs"),
  );

  console.log(
    `Generated ${data.refs.length} NHL officials, ${data.meta.totalGamesProcessed} games, ` +
      `${data.meta.dateRange?.earliest} → ${data.meta.dateRange?.latest}`,
  );
  console.log(`Wrote ${seedPath}, ${statsPath}, and data/nhl/game-logs.json`);
}

main();

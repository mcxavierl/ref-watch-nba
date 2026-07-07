#!/usr/bin/env npx tsx
/**
 * Generates comprehensive seeded ref stats from simulated game data.
 * Covers all NBA staff officials across three regular seasons.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { crewKey, refSlug } from "./lib/slug";
import type {
  RefGameRecord,
  RefProfile,
  RefStatsFile,
  TeamCrewSplit,
} from "./lib/types";

const NBA_TEAM_ABBRS = [
  "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
];

const SEASONS = ["2023-24", "2024-25", "2025-26"];
const LEAGUE_AVG_TOTAL = 225;
const LEAGUE_AVG_FOULS = 38.5;
const LEAGUE_OVER_BASELINE = 225;
const MIN_SAMPLE = 30;
const GAMES_PER_TEAM_PER_SEASON = 82;

/** 2025-26 NBA staff officials (Wikipedia roster). */
const REF_ROSTER: { name: string; number: number }[] = [
  { name: "Ray Acosta", number: 54 },
  { name: "Brandon Adair", number: 67 },
  { name: "Brent Barnaky", number: 36 },
  { name: "Dannica Baroody", number: 89 },
  { name: "Curtis Blair", number: 74 },
  { name: "Tony Brothers", number: 25 },
  { name: "Nick Buchert", number: 3 },
  { name: "John Butler", number: 30 },
  { name: "James Capers", number: 19 },
  { name: "Derrick Collins", number: 11 },
  { name: "John Conley", number: 56 },
  { name: "Sean Corbin", number: 33 },
  { name: "Kevin Cutler", number: 34 },
  { name: "Mousa Dagher", number: 28 },
  { name: "Eric Dalen", number: 37 },
  { name: "Marc Davis", number: 8 },
  { name: "JB DeRosa", number: 14 },
  { name: "Mitchell Ervin", number: 27 },
  { name: "Che Flores", number: 91 },
  { name: "Tyler Ford", number: 39 },
  { name: "Brian Forte", number: 45 },
  { name: "Scott Foster", number: 48 },
  { name: "Pat Fraher", number: 26 },
  { name: "Jacyn Goble", number: 68 },
  { name: "John Goble", number: 10 },
  { name: "Jason Goldenberg", number: 35 },
  { name: "Nate Green", number: 41 },
  { name: "David Guthrie", number: 16 },
  { name: "Robert Hussey", number: 85 },
  { name: "Intae Hwang", number: 73 },
  { name: "Simone Jelks", number: 81 },
  { name: "Matt Kallio", number: 53 },
  { name: "Bill Kennedy", number: 55 },
  { name: "Courtney Kirkland", number: 61 },
  { name: "Marat Kogut", number: 32 },
  { name: "Karl Lane", number: 77 },
  { name: "Mark Lindsay", number: 29 },
  { name: "Tre Maddox", number: 23 },
  { name: "Ed Malloy", number: 7 },
  { name: "Biniam Maru", number: 94 },
  { name: "Suyash Mehta", number: 82 },
  { name: "Sha'Rae Mitchell", number: 98 },
  { name: "Rodney Mott", number: 71 },
  { name: "Ashley Moyer-Gleich", number: 13 },
  { name: "Matt Myers", number: 43 },
  { name: "Andy Nagy", number: 83 },
  { name: "Brett Nansel", number: 44 },
  { name: "Pat O'Connell", number: 90 },
  { name: "JT Orr", number: 72 },
  { name: "Gediminas Petraitis", number: 50 },
  { name: "JD Ralls", number: 80 },
  { name: "Phenizee Ransom", number: 70 },
  { name: "Jenna Reneau", number: 93 },
  { name: "Tyler Ricks", number: 95 },
  { name: "Natalie Sago", number: 9 },
  { name: "Jenna Schroeder", number: 20 },
  { name: "Brandon Schwab", number: 86 },
  { name: "Danielle Scott", number: 87 },
  { name: "Evan Scott", number: 78 },
  { name: "Kevin Scott", number: 24 },
  { name: "Aaron Smith", number: 51 },
  { name: "Michael Smith", number: 38 },
  { name: "Jonathan Sterling", number: 17 },
  { name: "Ben Taylor", number: 46 },
  { name: "Dedric Taylor", number: 21 },
  { name: "Josh Tiven", number: 58 },
  { name: "Scott Twardoski", number: 52 },
  { name: "Justin Van Duyne", number: 64 },
  { name: "Scott Wall", number: 31 },
  { name: "CJ Washington", number: 12 },
  { name: "James Williams", number: 60 },
  { name: "Leon Wood", number: 40 },
  { name: "Sean Wright", number: 4 },
  { name: "Zach Zarba", number: 15 },
  { name: "Eric Lewis", number: 84 },
];

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

function pickCrew(rng: () => number): { name: string; number: number }[] {
  const pool = [...REF_ROSTER];
  const crew: { name: string; number: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(rng() * pool.length);
    crew.push(pool.splice(idx, 1)[0]);
  }
  return crew;
}

function seasonStartDate(season: string): Date {
  const startYear = Number.parseInt(season.slice(0, 4), 10);
  return new Date(Date.UTC(startYear, 9, 15));
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
    totalFouls: box.totalFouls,
    overHit: totalPoints > LEAGUE_OVER_BASELINE,
    teamFouls: isHome ? box.homeFouls : box.awayFouls,
    opponentFouls: isHome ? box.awayFouls : box.homeFouls,
    teamWin,
    isHome,
  };
}

function generate(): RefStatsFile {
  const rng = mulberry32(42);
  const refGames = new Map<string, RefGameRecord[]>();
  const refMeta = new Map<string, { name: string; number: number }>();
  const teamByCrew = new Map<string, Map<string, TeamCrewBucket>>();
  for (const abbr of NBA_TEAM_ABBRS) {
    teamByCrew.set(abbr, new Map());
  }

  const allDates: string[] = [];
  let processed = 0;
  let gameSeq = 0;

  for (const season of SEASONS) {
    let seasonGameIndex = 0;
    const schedule: [string, string][] = [];
    for (let i = 0; i < NBA_TEAM_ABBRS.length; i++) {
      for (let j = i + 1; j < NBA_TEAM_ABBRS.length; j++) {
        for (let k = 0; k < 2; k++) {
          schedule.push(
            k === 0
              ? [NBA_TEAM_ABBRS[i], NBA_TEAM_ABBRS[j]]
              : [NBA_TEAM_ABBRS[j], NBA_TEAM_ABBRS[i]],
          );
        }
      }
    }
    while (schedule.length < GAMES_PER_TEAM_PER_SEASON * (NBA_TEAM_ABBRS.length / 2)) {
      const a = NBA_TEAM_ABBRS[Math.floor(rng() * NBA_TEAM_ABBRS.length)];
      let b = NBA_TEAM_ABBRS[Math.floor(rng() * NBA_TEAM_ABBRS.length)];
      while (b === a) {
        b = NBA_TEAM_ABBRS[Math.floor(rng() * NBA_TEAM_ABBRS.length)];
      }
      schedule.push(rng() > 0.5 ? [a, b] : [b, a]);
    }

    const gamesInSeason = schedule.length;

    for (const [homeTeam, awayTeam] of schedule) {
      const officials = pickCrew(rng);
      const homeScore = 95 + Math.floor(rng() * 35);
      const awayScore = 95 + Math.floor(rng() * 35);
      const homeFouls = 16 + Math.floor(rng() * 10);
      const awayFouls = 16 + Math.floor(rng() * 10);
      const date = gameDate(season, seasonGameIndex, gamesInSeason);
      allDates.push(date);

      const box: SimBox = {
        gameId: `002${season.slice(2, 4)}${String(gameSeq).padStart(4, "0")}`,
        date,
        season,
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        homeFouls,
        awayFouls,
        totalFouls: homeFouls + awayFouls,
      };
      gameSeq++;
      seasonGameIndex++;

      const totalPoints = homeScore + awayScore;
      const record: RefGameRecord = {
        gameId: box.gameId,
        date,
        season,
        homeTeam,
        awayTeam,
        totalPoints,
        totalFouls: box.totalFouls,
        overHit: totalPoints > LEAGUE_OVER_BASELINE,
        raptorsInvolved: homeTeam === "TOR" || awayTeam === "TOR",
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
      }

      processed++;
    }
  }

  allDates.sort();
  const refs: RefProfile[] = [];
  for (const [slug, games] of refGames) {
    const meta = refMeta.get(slug)!;
    const avgTotal = games.reduce((s, g) => s + g.totalPoints, 0) / games.length;
    const overRate = games.filter((g) => g.overHit).length / games.length;
    const avgFouls = games.reduce((s, g) => s + g.totalFouls, 0) / games.length;

    refs.push({
      slug,
      name: meta.name,
      number: meta.number,
      games: games.length,
      avgTotalPoints: round1(avgTotal),
      overRate: round3(overRate),
      avgFouls: round1(avgFouls),
      homeCoverRate: null,
      totalPointsDelta: round1(avgTotal - LEAGUE_AVG_TOTAL),
      foulsDelta: round1(avgFouls - LEAGUE_AVG_FOULS),
      seasons: [...new Set(games.map((g) => g.season))],
      recentGames: games.slice(-8).reverse(),
    });
  }
  refs.sort((a, b) => b.games - a.games);

  const teamSplits: Record<string, TeamCrewSplit[]> = {};
  for (const abbr of NBA_TEAM_ABBRS) {
    teamSplits[abbr] = [...teamByCrew.get(abbr)!.entries()]
      .map(([key, data]) => buildTeamSplit(key, data.crewNames, data.games))
      .sort((a, b) => b.games - a.games);
  }

  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: SEASONS,
      leagueAvgTotal: LEAGUE_AVG_TOTAL,
      leagueAvgFouls: LEAGUE_AVG_FOULS,
      leagueOverBaseline: LEAGUE_OVER_BASELINE,
      minSampleSize: MIN_SAMPLE,
      source: "seeded",
      atsAvailable: false,
      refCount: refs.length,
      totalGamesProcessed: processed,
      dateRange: {
        earliest: allDates[0],
        latest: allDates[allDates.length - 1],
      },
      note:
        "Simulated game data for all NBA staff officials across 2023-26 regular seasons. " +
        "Re-run npm run build-ref-data on a network that can reach stats.nba.com for live backfill.",
    },
    refs,
    teamSplits,
  };
}

function main() {
  const data = generate();
  const dataDir = path.join(process.cwd(), "data");
  const seedPath = path.join(dataDir, "ref-stats.seed.json");
  const statsPath = path.join(dataDir, "ref-stats.json");

  fs.writeFileSync(seedPath, `${JSON.stringify(data, null, 2)}\n`);
  fs.writeFileSync(statsPath, `${JSON.stringify(data, null, 2)}\n`);

  console.log(
    `Generated ${data.refs.length} refs, ${data.meta.totalGamesProcessed} games, ` +
      `${data.meta.dateRange?.earliest} → ${data.meta.dateRange?.latest}`,
  );
  console.log(`Wrote ${seedPath} and ${statsPath}`);
}

main();

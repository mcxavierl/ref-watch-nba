#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import type { RefProfile, RefStatsFile } from "../../src/lib/types";
import { refSlug } from "../lib/slug";
import { FALLBACK_EPL } from "../lib/baselines";
import type { TeamCrewSplit } from "../../src/lib/types";
import { EPL_TEAMS } from "../../src/lib/epl/teams";

const dataDir = path.join(process.cwd(), "data", "epl");

/** Current PGMO Select Group — placeholder stats for offseason scaffold. */
const PGMO_REFS = [
  "Michael Oliver",
  "Anthony Taylor",
  "Paul Tierney",
  "Craig Pawson",
  "Stuart Attwell",
  "Simon Hooper",
  "Jarred Gillett",
  "Robert Jones",
  "Chris Kavanagh",
  "Andy Madley",
  "Peter Bankes",
  "Darren England",
  "John Brooks",
  "Tim Robinson",
  "Sam Allison",
  "Thomas Bramall",
  "Darren Bond",
  "David Coote",
  "Michael Salisbury",
  "Rebecca Welch",
];

function seedRef(name: string, i: number): RefProfile {
  const games = 52 + (i % 24);
  const slug = refSlug(name, 0);
  const goalsDelta = (i % 5) * 0.06 - 0.12;
  const foulsDelta = (i % 7) * 0.45 - 0.6;
  const overRate = 0.46 + (i % 11) * 0.02;
  const avgTotalPoints = FALLBACK_EPL.leagueAvgTotal + goalsDelta;
  const avgFouls = FALLBACK_EPL.leagueAvgFouls + foulsDelta;
  return {
    slug,
    name,
    number: 0,
    games,
    avgTotalPoints,
    overRate,
    avgFouls,
    homeCoverRate: 0.48 + (i % 5) * 0.03,
    totalPointsDelta: goalsDelta,
    foulsDelta,
    seasons: ["2024-25"],
    recentGames: [],
    eplAnalytics: {
      avgGoalsPerGame: avgTotalPoints,
      goalsDelta,
      avgFoulsPerGame: avgFouls,
      foulsDelta,
      avgYellowCardsPerGame: 3.5 + (i % 3) * 0.15,
      yellowCardsDelta: (i % 4) * 0.2 - 0.3,
      avgRedCardsPerGame: 0.12,
      redCardsDelta: 0,
      avgPenaltiesPerGame: 0.28,
      penaltiesDelta: 0,
      avgCardImbalance: 0.4,
      balancedGameRate: 0.55,
      balanceKind: i % 3 === 0 ? "balancer" : i % 3 === 1 ? "asymmetric" : "neutral",
    },
  };
}

function seedTeamSplits(refs: RefProfile[]): Record<string, TeamCrewSplit[]> {
  const teams = EPL_TEAMS.map((t) => t.abbr);
  const splits: Record<string, TeamCrewSplit[]> = {};

  for (let ti = 0; ti < teams.length; ti++) {
    const team = teams[ti]!;
    const ref = refs[ti % refs.length]!;
    const games = 14 + (ti % 6);
    const wins = Math.round(games * (0.44 + (ti % 4) * 0.05));
    const losses = games - wins;
    const homeGames = Math.ceil(games / 2);
    const awayGames = games - homeGames;
    const homeWins = Math.round(wins * 0.55);
    const awayWins = wins - homeWins;
    const avgTotalPoints = FALLBACK_EPL.leagueAvgTotal + (ti % 5) * 0.08 - 0.16;
    const avgFouls = FALLBACK_EPL.leagueAvgFouls + (ti % 6) * 0.4 - 1;
    const avgTeamFouls = avgFouls * 0.52;
    const avgOpponentFouls = avgFouls * 0.48;

    splits[team] = [
      {
        crewKey: ref.slug,
        crewNames: [ref.name],
        games,
        avgTotalPoints,
        overRate: 0.42 + (ti % 8) * 0.04,
        avgFouls,
        wins,
        losses,
        totalDelta: avgTotalPoints - FALLBACK_EPL.leagueAvgTotal,
        homeGames,
        awayGames,
        homeWins,
        homeLosses: homeGames - homeWins,
        awayWins,
        awayLosses: awayGames - awayWins,
        avgTeamFouls,
        avgOpponentFouls,
        foulDifferential: avgTeamFouls - avgOpponentFouls,
      },
    ];
  }

  return splits;
}

function buildStats(): RefStatsFile {
  const refs = PGMO_REFS.map(seedRef);
  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: ["2024-25"],
      leagueAvgTotal: FALLBACK_EPL.leagueAvgTotal,
      leagueAvgFouls: FALLBACK_EPL.leagueAvgFouls,
      leagueOverBaseline: FALLBACK_EPL.leagueOverBaseline,
      leagueAvgYellowCards: 3.5,
      leagueAvgRedCards: 0.15,
      leagueAvgPenalties: 0.28,
      minSampleSize: 30,
      source: "seeded",
      atsAvailable: false,
      note:
        "Premier League offseason seed. PGMO roster with illustrative match samples. Run npm run build-epl-data for match backfill.",
    },
    refs,
    teamSplits: seedTeamSplits(refs),
  };
}

function main() {
  fs.mkdirSync(dataDir, { recursive: true });
  const stats = buildStats();
  const assignments = {
    lastUpdated: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
    source: "seeded",
    games: [],
  };
  const gameLogs = {
    lastUpdated: new Date().toISOString(),
    league: "EPL",
    source: "offseason-seed",
    games: [],
  };

  for (const file of ["ref-stats.seed.json", "ref-stats.json"]) {
    fs.writeFileSync(path.join(dataDir, file), `${JSON.stringify(stats, null, 2)}\n`);
  }
  fs.writeFileSync(path.join(dataDir, "assignments.json"), `${JSON.stringify(assignments, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "game-logs.json"), `${JSON.stringify(gameLogs, null, 2)}\n`);
  console.log(`EPL seed written (${stats.refs.length} PGMO refs) → data/epl/`);
}

main();

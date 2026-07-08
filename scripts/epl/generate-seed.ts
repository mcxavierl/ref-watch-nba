#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import type { RefProfile, RefStatsFile } from "../../src/lib/types";
import { refSlug } from "../lib/slug";
import { FALLBACK_EPL } from "../lib/baselines";

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
  const games = 0;
  const slug = refSlug(name, 0);
  return {
    slug,
    name,
    number: 0,
    games,
    avgTotalPoints: FALLBACK_EPL.leagueAvgTotal,
    overRate: 0.5,
    avgFouls: FALLBACK_EPL.leagueAvgFouls,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: [],
    recentGames: [],
    eplAnalytics: {
      avgGoalsPerGame: FALLBACK_EPL.leagueAvgTotal,
      goalsDelta: (i % 5) * 0.05 - 0.1,
      avgFoulsPerGame: FALLBACK_EPL.leagueAvgFouls,
      foulsDelta: (i % 7) * 0.3 - 0.9,
      avgYellowCardsPerGame: 3.5,
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

function buildStats(): RefStatsFile {
  return {
    meta: {
      lastUpdated: new Date().toISOString(),
      seasons: [],
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
        "Premier League offseason seed — PGMO roster placeholders. Run npm run build-epl-data for match backfill.",
    },
    refs: PGMO_REFS.map(seedRef),
    teamSplits: {},
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

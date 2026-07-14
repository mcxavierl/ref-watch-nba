import assert from "node:assert/strict";
import test from "node:test";
import {
  MIN_REGIONAL_GAMES,
  computeGeoCorrelationsForLeague,
  computeMatchupOriginVariance,
  computeRefOriginVariance,
  inferCountryFromBirthplace,
  isOriginVarianceOutlier,
  isTopGeoFinding,
  nationalOriginDistance,
  resolveOfficialTerritories,
  teamInTerritory,
} from "@/lib/geo-correlations";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import type { RefStatsFile } from "@/lib/types";

const TEST_REF = {
  slug: "test-official-1",
  name: "Test Official",
  number: 1,
  games: 100,
};

const STATS = {
  meta: {
    lastUpdated: "2026-07-13",
    seasons: ["2024-25"],
    leagueAvgTotal: 220,
    leagueAvgFouls: 40,
    leagueOverBaseline: 0.5,
    minSampleSize: 30,
    source: "seeded" as const,
    atsAvailable: true,
  },
  refs: [
    {
      ...TEST_REF,
      birthplace: "Boston, MA",
    },
  ],
  teamSplits: {},
  refGeography: {
    "test-official-1": { birthplace: "Boston, MA" },
  },
} as unknown as RefStatsFile;

function makeOfficial(name: string, number: number) {
  return { name, number, role: "referee" as const };
}

function syntheticGame(
  index: number,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  homeFlags?: number,
  awayFlags?: number,
): RuntimeGameLogEntry {
  return {
    gameId: `game-${index}`,
    date: "2024-10-01",
    season: "2024-25",
    league: "NFL",
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    totalPoints: homeScore + awayScore,
    totalFouls: 10,
    homeFlags,
    awayFlags,
    closingTotal: 45.5,
    homeSpread: -3.5,
    lineSource: "external",
    officials: [makeOfficial("Test Official", 1)],
  };
}

test("resolveOfficialTerritories maps Massachusetts to New England teams", () => {
  const territories = resolveOfficialTerritories("Boston, MA", "NFL");
  assert.ok(territories.length >= 1);
  const ne = territories.find((t) => t.territoryId === "us-new-england");
  assert.ok(ne);
  assert.ok(ne.teamAbbrs.includes("NE"));
});

test("resolveOfficialTerritories maps Seville to Andalusian club IDs", () => {
  const territories = resolveOfficialTerritories("Seville, Andalusia", "LALIGA");
  const andalusia = territories.find((t) => t.territoryId === "es-andalusia");
  assert.ok(andalusia);
  assert.ok(teamInTerritory("SEV", andalusia));
  assert.ok(teamInTerritory("BET", andalusia));
  assert.ok(teamInTerritory("CAD", andalusia));
});

test("computeGeoCorrelationsForLeague detects hometown alignment on win rate", () => {
  const games: RuntimeGameLogEntry[] = [];

  for (let i = 0; i < MIN_REGIONAL_GAMES; i += 1) {
    games.push(syntheticGame(i, "NE", "DAL", 28, 14));
  }
  for (let i = 0; i < MIN_REGIONAL_GAMES; i += 1) {
    games.push(
      syntheticGame(i + 100, "DAL", "NYG", 17, 24, 3, 8),
    );
  }

  const findings = computeGeoCorrelationsForLeague("NFL", STATS, games);
  const alignment = findings.find(
    (f) =>
      f.archetype === "hometown-alignment" &&
      f.signal === "win" &&
      f.refSlug === TEST_REF.slug,
  );

  assert.ok(alignment, "expected hometown alignment on regional win rate");
  assert.equal(alignment.regionalGames, MIN_REGIONAL_GAMES);
  assert.ok(alignment.regionalRate > alignment.baselineRate);
  assert.ok(isTopGeoFinding(alignment));
});

test("computeGeoCorrelationsForLeague detects overcompensation on penalty frequency", () => {
  const games: RuntimeGameLogEntry[] = [];

  for (let i = 0; i < MIN_REGIONAL_GAMES; i += 1) {
    games.push(syntheticGame(i, "NE", "DAL", 21, 20, 10, 2));
  }
  for (let i = 0; i < MIN_REGIONAL_GAMES; i += 1) {
    games.push(syntheticGame(i + 200, "DAL", "NYG", 21, 20, 5, 5));
  }

  const findings = computeGeoCorrelationsForLeague("NFL", STATS, games);
  const counter = findings.find(
    (f) =>
      f.archetype === "overcompensation-counter-bias" &&
      f.signal === "whistle" &&
      f.refSlug === TEST_REF.slug,
  );

  assert.ok(counter, "expected counter-bias on regional penalty frequency");
  assert.ok(counter.regionalRate > counter.baselineRate);
  assert.ok(isTopGeoFinding(counter));
});

test("computeGeoCorrelationsForLeague rejects thin regional samples", () => {
  const games: RuntimeGameLogEntry[] = [];
  for (let i = 0; i < MIN_REGIONAL_GAMES - 1; i += 1) {
    games.push(syntheticGame(i, "NE", "DAL", 35, 10));
  }
  for (let i = 0; i < MIN_REGIONAL_GAMES; i += 1) {
    games.push(syntheticGame(i + 300, "DAL", "NYG", 10, 35));
  }

  const findings = computeGeoCorrelationsForLeague("NFL", STATS, games);
  assert.equal(findings.length, 0);
});

test("computeGeoCorrelationsForLeague returns empty without game logs", () => {
  assert.deepEqual(computeGeoCorrelationsForLeague("NBA", STATS, null), []);
});

test("nationalOriginDistance scores geopolitical distance for origin variance", () => {
  assert.equal(nationalOriginDistance("USA", "USA"), 0);
  assert.equal(nationalOriginDistance("USA", "MEX"), 0.5);
  assert.equal(nationalOriginDistance("USA", "BRA"), 1);
  assert.equal(inferCountryFromBirthplace("Boston, MA"), "USA");
  assert.equal(inferCountryFromBirthplace("Madrid, Spain"), "ESP");
  assert.equal(computeMatchupOriginVariance("USA", "ENG", "ESP"), 1);

  const variance = computeRefOriginVariance(
    {
      birthCountry: "USA",
      teamStats: {
        LAL: {
          games: 20,
          winRate: 0.55,
          wins: 11,
          losses: 9,
          avgTotalPoints: 220,
          overRate: 0.5,
          avgFoulDifferential: 0,
        },
      },
    },
    () => "USA",
  );
  assert.equal(variance, 0);
  assert.equal(isOriginVarianceOutlier({ originVariance: 0.8 }), true);
  assert.equal(isOriginVarianceOutlier({ originVariance: 0.2 }), false);
});

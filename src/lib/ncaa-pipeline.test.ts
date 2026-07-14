import assert from "node:assert/strict";
import test from "node:test";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import {
  buildNcaaConferenceCrewIndex,
  crewKeyFromOfficials,
  resolveGameConferenceTerritory,
  verifyGameLogEntry,
  verifyNcaaPipelineIntegrity,
  verifyRefTeamMatchHistory,
  isNcaaPipelineFullyVerified,
  resolveNcaaDataVerified,
  applyNcaaPipelineVerificationMeta,
} from "@/lib/ncaa-pipeline";
import type { RefProfile, RefStatsFile } from "@/lib/types";

const OFFICIALS = [
  { name: "Jane Official", number: 12, role: "referee" as const },
  { name: "John Official", number: 34, role: "referee" as const },
];

function completeGame(overrides: Partial<RuntimeGameLogEntry> = {}): RuntimeGameLogEntry {
  return {
    gameId: "401000001",
    date: "2024-01-05",
    season: "2023-24",
    league: "CBB",
    homeTeam: "DUKE",
    awayTeam: "UNC",
    homeScore: 75,
    awayScore: 70,
    totalPoints: 145,
    totalFouls: 32,
    closingTotal: 145,
    homeSpread: -2,
    lineSource: "external",
    officials: OFFICIALS,
    ...overrides,
  };
}

function completeRef(): RefProfile {
  return {
    slug: "jane-official-12",
    name: "Jane Official",
    number: 12,
    games: 12,
    avgTotalPoints: 145,
    overRate: 0.5,
    avgFouls: 32,
    homeCoverRate: null,
    totalPointsDelta: 0,
    foulsDelta: 0,
    seasons: ["2023-24"],
    recentGames: [],
    teamStats: {
      DUKE: {
        games: 6,
        avgFoulDifferential: 1,
        avgTotalPoints: 145,
        overRate: 0.5,
        winRate: 0.5,
      },
      UNC: {
        games: 6,
        avgFoulDifferential: -1,
        avgTotalPoints: 144,
        overRate: 0.48,
        winRate: 0.52,
      },
    },
  };
}

const COMPLETE_STATS = {
  meta: {
    lastUpdated: "2026-07-13",
    seasons: ["2023-24"],
    leagueAvgTotal: 145,
    leagueAvgFouls: 32,
    leagueOverBaseline: 145,
    minSampleSize: 30,
    source: "espn" as const,
    data_verified: true,
    data_source: "ESPN",
    atsAvailable: false,
  },
  refs: [completeRef()],
  teamSplits: {},
} as RefStatsFile;

test("resolveGameConferenceTerritory maps ACC matchups to ACC bucket", () => {
  assert.equal(resolveGameConferenceTerritory("cbb", "DUKE", "UNC"), "ACC");
  assert.equal(resolveGameConferenceTerritory("cfb", "ALA", "UGA"), "SEC");
});

test("buildNcaaConferenceCrewIndex groups crews by conference territory", () => {
  const index = buildNcaaConferenceCrewIndex("cbb", [
    completeGame(),
    completeGame({
      gameId: "401000002",
      homeTeam: "UK",
      awayTeam: "TENN",
    }),
  ]);

  assert.equal(index.totalMappedGames, 2);
  assert.equal(index.territories.ACC.gameCount, 1);
  assert.equal(index.territories.SEC.gameCount, 1);
  assert.equal(index.territories.ACC.crews.length, 1);
  assert.equal(
    index.territories.ACC.assignments[0]?.crewKey,
    crewKeyFromOfficials(OFFICIALS),
  );
});

test("verifyGameLogEntry flags empty crew lists as unverified", () => {
  const result = verifyGameLogEntry(completeGame({ officials: [] }));
  assert.equal(result.verified, false);
  assert.match(result.reasons.join(" "), /crew list empty/);
});

test("verifyRefTeamMatchHistory flags missing team match history", () => {
  const ref = { ...completeRef(), teamStats: undefined };
  const result = verifyRefTeamMatchHistory(ref);
  assert.equal(result.verified, false);
  assert.match(result.reasons.join(" "), /team match history missing/);
});

test("verifyNcaaPipelineIntegrity requires 100% game and ref coverage", () => {
  const pass = verifyNcaaPipelineIntegrity("cbb", COMPLETE_STATS, [completeGame()]);
  assert.equal(pass.verified, true);
  assert.equal(pass.coveragePct, 100);

  const fail = verifyNcaaPipelineIntegrity("cbb", COMPLETE_STATS, [
    completeGame({ officials: [] }),
  ]);
  assert.equal(fail.verified, false);
  assert.ok(fail.failures.length > 0);
});

test("resolveNcaaDataVerified stays false when pipeline coverage is incomplete", () => {
  const verified = resolveNcaaDataVerified("cbb", COMPLETE_STATS, [completeGame()]);
  assert.equal(verified, true);

  const unverified = resolveNcaaDataVerified("cbb", COMPLETE_STATS, [
    completeGame({ officials: [] }),
  ]);
  assert.equal(unverified, false);
});

test("applyNcaaPipelineVerificationMeta stamps meta gate fields", () => {
  const stamped = applyNcaaPipelineVerificationMeta("cbb", COMPLETE_STATS, [
    completeGame(),
  ]);
  assert.equal(stamped.meta.data_verified, true);
  assert.equal(stamped.meta.ncaa_pipeline_verified, true);
  assert.equal(stamped.meta.ncaa_pipeline_coverage_pct, 100);
  assert.equal(isNcaaPipelineFullyVerified({
    league: "cbb",
    verified: true,
    coveragePct: 100,
    totalGames: 1,
    verifiedGames: 1,
    totalRefs: 1,
    verifiedRefs: 1,
    failures: [],
  }), true);
});

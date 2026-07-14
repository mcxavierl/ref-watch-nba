import assert from "node:assert/strict";
import test from "node:test";
import type { RuntimeGameLogEntry } from "@/lib/game-logs-preload";
import { teamsByConference as cbbTeamsByConference } from "@/lib/cbb/teams";
import { teamsByConference as cfbTeamsByConference } from "@/lib/cfb/teams";
import {
  isHydratableConferenceMap,
  isHydratableGameLogFile,
  ncaaLeaguesForPath,
  pathNeedsNcaaComponents,
  preloadNcaaSportComponents,
  shardGamesBySeason,
} from "@/lib/ncaa-isolate-components";
import {
  beginWorkerIsolateRequest,
  endWorkerIsolateRequest,
  getWorkerIsolateStore,
} from "@/lib/worker-isolate-store";

test("pathNeedsNcaaComponents scopes to college routes", () => {
  assert.equal(pathNeedsNcaaComponents("/cbb/matrix"), "cbb");
  assert.equal(pathNeedsNcaaComponents("/cfb/research"), "cfb");
  assert.equal(pathNeedsNcaaComponents("/nba"), null);
});

test("ncaaLeaguesForPath scopes to active college routes", () => {
  assert.deepEqual(ncaaLeaguesForPath("/cbb"), ["cbb"]);
  assert.deepEqual(ncaaLeaguesForPath("/cfb/research"), ["cfb"]);
  assert.deepEqual(ncaaLeaguesForPath("/ncaa/integrity-audit"), []);
  assert.deepEqual(ncaaLeaguesForPath("/nba"), []);
});

test("shardGamesBySeason partitions games without retaining source array refs", () => {
  const games: RuntimeGameLogEntry[] = [
    {
      gameId: "1",
      date: "2024-01-01",
      season: "2023-24",
      league: "CBB",
      homeTeam: "DUKE",
      awayTeam: "UNC",
      homeScore: 70,
      awayScore: 68,
      totalPoints: 138,
      totalFouls: 30,
      closingTotal: 140,
      homeSpread: -2,
      lineSource: "external",
      officials: [],
    },
    {
      gameId: "2",
      date: "2024-02-01",
      season: "2023-24",
      league: "CBB",
      homeTeam: "UK",
      awayTeam: "KU",
      homeScore: 75,
      awayScore: 72,
      totalPoints: 147,
      totalFouls: 32,
      closingTotal: 145,
      homeSpread: 1,
      lineSource: "external",
      officials: [],
    },
    {
      gameId: "3",
      date: "2024-11-01",
      season: "2024-25",
      league: "CBB",
      homeTeam: "GONZ",
      awayTeam: "UCLA",
      homeScore: 80,
      awayScore: 78,
      totalPoints: 158,
      totalFouls: 28,
      closingTotal: 150,
      homeSpread: -4,
      lineSource: "external",
      officials: [],
    },
  ];

  const shards = shardGamesBySeason(games);
  assert.equal(shards.get("2023-24")?.length, 2);
  assert.equal(shards.get("2024-25")?.length, 1);
});

test("isHydratableGameLogFile rejects empty college payloads", () => {
  assert.equal(isHydratableGameLogFile(null), false);
  assert.equal(
    isHydratableGameLogFile({
      lastUpdated: "2026-01-01",
      league: "CFB",
      source: "seed",
      games: [],
    }),
    false,
  );
  assert.equal(
    isHydratableGameLogFile({
      lastUpdated: "2026-01-01",
      league: "CBB",
      source: "espn",
      games: [{ gameId: "1" } as RuntimeGameLogEntry],
    }),
    true,
  );
});

test("preloadNcaaSportComponents bails on empty CFB shards without isolate retention", async () => {
  beginWorkerIsolateRequest();
  try {
    const hydrated = await preloadNcaaSportComponents("http://localhost:3000", "cfb");
    assert.equal(hydrated, false);
    assert.equal(getWorkerIsolateStore().ncaaFootballComponents, null);
    assert.equal(getWorkerIsolateStore().ncaaBasketballComponents, null);
  } finally {
    endWorkerIsolateRequest();
  }
});

test("conference registry maps are non-empty for both college sports", () => {
  const cbbMap = new Map(
    Object.entries(cbbTeamsByConference()).map(([conf, teams]) => [
      conf,
      teams.map((team) => team.abbr),
    ]),
  );
  const cfbMap = new Map(
    Object.entries(cfbTeamsByConference()).map(([conf, teams]) => [
      conf,
      teams.map((team) => team.abbr),
    ]),
  );
  assert.equal(isHydratableConferenceMap(cbbMap), true);
  assert.equal(isHydratableConferenceMap(cfbMap), true);
});

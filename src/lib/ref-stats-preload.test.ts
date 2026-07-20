import assert from "node:assert/strict";
import { test } from "node:test";
import { computeFindings } from "@/lib/nfl/findings";
import { computeAllFindings as computeNhlFindings } from "@/lib/nhl/findings";
import {
  getCachedRefStats,
  getPreferHydratedRefStats,
  leaguesForPath,
  pathNeedsGameLogs,
  pathNeedsTeamSplits,
  setCachedRefStats,
} from "@/lib/ref-stats-preload";
import type { RefStatsFile } from "@/lib/types";

test("pathNeedsGameLogs hydrates ref and team pages from layout (not hub routes)", () => {
  assert.equal(pathNeedsGameLogs("/"), false);
  assert.equal(pathNeedsGameLogs("/nfl"), false);
  assert.equal(pathNeedsGameLogs("/matrix"), false);
  assert.equal(pathNeedsGameLogs("/teams/BOS"), true);
  assert.equal(pathNeedsGameLogs("/nfl/matrix"), false);
  assert.equal(pathNeedsGameLogs("/nfl/teams/NE"), true);
  assert.equal(pathNeedsGameLogs("/nfl/teams/KC"), true);
  assert.equal(pathNeedsGameLogs("/nfl/refs"), true);
  assert.equal(pathNeedsGameLogs("/nfl/refs/scott-blank"), true);
  assert.equal(pathNeedsGameLogs("/nfl/rankings"), false);
  assert.equal(pathNeedsGameLogs("/nfl/research"), false);
});

test("pathNeedsTeamSplits skips ref hubs and static pages", () => {
  assert.equal(pathNeedsTeamSplits("/overview"), false);
  assert.equal(pathNeedsTeamSplits("/methodology"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/refs"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/refs/scott-blank"), false);
  assert.equal(pathNeedsTeamSplits("/"), false);
  assert.equal(pathNeedsTeamSplits("/nba"), false);
  assert.equal(pathNeedsTeamSplits("/nfl"), false);
  assert.equal(pathNeedsTeamSplits("/nhl"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/matrix"), true);
  assert.equal(pathNeedsTeamSplits("/nfl/teams/KC"), true);
});

test("pathNeedsTeamSplits skips insight and research hubs", () => {
  assert.equal(pathNeedsTeamSplits("/insights"), false);
  assert.equal(pathNeedsTeamSplits("/rankings"), false);
  assert.equal(pathNeedsTeamSplits("/trends"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/insights"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/research"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/rankings"), false);
  assert.equal(pathNeedsTeamSplits("/nfl/trends"), false);
  assert.equal(pathNeedsTeamSplits("/laliga/crews"), false);
  assert.equal(pathNeedsTeamSplits("/nba/insights"), false);
});

test("leaguesForPath scopes preload to the active league", () => {
  assert.deepEqual(leaguesForPath("/"), []);
  assert.deepEqual(leaguesForPath("/overview"), []);
  assert.deepEqual(leaguesForPath("/nba"), ["nba"]);
  assert.deepEqual(leaguesForPath("/nfl"), ["nfl"]);
  assert.deepEqual(leaguesForPath("/laliga/insights"), ["laliga"]);
  assert.deepEqual(leaguesForPath("/research"), ["nba"]);
  assert.deepEqual(leaguesForPath(""), []);
  assert.deepEqual(leaguesForPath("/not-a-route"), ["nba"]);
});

test("computeFindings returns empty when scoped stats have no refs", () => {
  assert.deepEqual(computeFindings(6, ["2099-00"]), []);
});

test("hub mode skips team-split and game-log findings (Worker 1102 guard)", () => {
  const full = computeNhlFindings();
  const hub = computeNhlFindings(undefined, { hub: true });
  assert.ok(full.length > 0);
  assert.ok(hub.length > 0);

  const heavyPattern =
    /matrix|crew-dominance|close-game|team-crew-anomaly|scoring-extremes|team-home-road/;
  assert.ok(
    full.some((finding) => heavyPattern.test(finding.id)),
    "full findings should include at least one heavy builder",
  );
  assert.ok(
    !hub.some((finding) => heavyPattern.test(finding.id)),
    "hub findings must skip team-split and game-log builders",
  );
});

test("getPreferHydratedRefStats serves ESPN ingest before verification gate", () => {
  const stats: RefStatsFile = {
    refs: [
      {
        slug: "sample-ref-1",
        name: "Sample Ref",
        number: 1,
        games: 40,
        avgTotalPoints: 140,
        overRate: 0.5,
        avgFouls: 34,
        homeCoverRate: null,
        totalPointsDelta: 0,
        foulsDelta: 0,
        seasons: ["2024-25"],
        recentGames: [],
      },
    ],
    teamSplits: {},
    meta: {
      lastUpdated: "2026-01-01",
      seasons: ["2024-25"],
      leagueAvgTotal: 140,
      leagueAvgFouls: 34,
      leagueOverBaseline: 140,
      minSampleSize: 30,
      source: "espn",
      data_verified: false,
      totalGamesProcessed: 120,
      atsAvailable: false,
    },
  };

  setCachedRefStats("cbb", stats);
  assert.equal(getPreferHydratedRefStats("cbb")?.refs.length, 1);
  assert.equal(getCachedRefStats("cbb")?.refs.length, 1);
});

test("coalesceRefStatsFromDiskAndBundled prefers bundled when disk core is empty", async () => {
  const { coalesceRefStatsFromDiskAndBundled } = await import(
    "@/lib/ref-stats-bundled"
  );
  const { getBundledNbaRefStatsCore } = await import("@/lib/ref-stats-bundled");
  const bundled = getBundledNbaRefStatsCore();
  assert.ok(bundled && bundled.refs.length > 0);

  const emptyDisk: RefStatsFile = {
    refs: [],
    teamSplits: {},
    meta: {
      lastUpdated: "2026-01-01",
      seasons: [],
      leagueAvgTotal: 220,
      leagueAvgFouls: 40,
      leagueOverBaseline: 220,
      minSampleSize: 30,
      source: "seeded",
      atsAvailable: false,
    },
  };

  const merged = coalesceRefStatsFromDiskAndBundled(emptyDisk, bundled);
  assert.equal(merged?.refs.length, bundled!.refs.length);
});

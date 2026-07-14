import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import {
  buildOverviewInsightsPayload,
  shouldSkipLeagueRegeneration,
} from "./insights-build";
import { getLeagueInsightSourceMtime } from "./insights-data-loader";

let tempRoot = "";
let previousRoot: string | undefined;

function writeMinimalLeagueData(
  root: string,
  leagueId: "nba" | "nhl" | "nfl" | "epl" | "laliga",
  mtimeMs: number,
): void {
  const leagueDir =
    leagueId === "nba" ? path.join(root, "data") : path.join(root, "data", leagueId);
  fs.mkdirSync(leagueDir, { recursive: true });

  const core = {
    meta: {
      lastUpdated: "2025-01-01T00:00:00.000Z",
      seasons: ["2024-25"],
      leagueAvgTotal: 220,
      leagueAvgFouls: 40,
      leagueOverBaseline: 0.5,
      minSampleSize: 8,
      source: "seeded",
      atsAvailable: false,
    },
    refs: [
      {
        slug: `${leagueId}-ref-1`,
        name: `${leagueId.toUpperCase()} Ref`,
        number: 1,
        games: 80,
        avgTotalPoints: 220,
        overRate: 0.5,
        avgFouls: 50,
        homeCoverRate: null,
        totalPointsDelta: 0,
        foulsDelta: 10,
        seasons: ["2024-25"],
        recentGames: [],
        teamStats: {
          AAA: {
            games: 12,
            winRate: 0.75,
            wins: 9,
            losses: 3,
            avgFoulDifferential: 1,
            overRate: 0.5,
            avgTotalPoints: 220,
          },
        },
      },
    ],
    teamSplits: {},
  };

  const teamSplits = {
    AAA: [
      {
        crewKey: `${leagueId}-ref-1`,
        crewNames: [`${leagueId.toUpperCase()} Ref`],
        games: 100,
        avgTotalPoints: 220,
        overRate: 0.5,
        avgFouls: 40,
        wins: 50,
        losses: 50,
        totalDelta: 0,
        homeGames: 50,
        awayGames: 50,
        homeWins: 25,
        homeLosses: 25,
        awayWins: 25,
        awayLosses: 25,
        avgTeamFouls: 20,
        avgOpponentFouls: 20,
        foulDifferential: 0,
      },
    ],
  };

  const corePath = path.join(leagueDir, "ref-stats-core.json");
  const splitsPath = path.join(leagueDir, "team-splits.json");

  fs.writeFileSync(corePath, `${JSON.stringify(core)}\n`);
  fs.writeFileSync(splitsPath, `${JSON.stringify(teamSplits)}\n`);
  fs.utimesSync(corePath, mtimeMs / 1000, mtimeMs / 1000);
  fs.utimesSync(splitsPath, mtimeMs / 1000, mtimeMs / 1000);
}

describe("insights incremental build", () => {
  before(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "insights-build-"));
    previousRoot = process.env.INSIGHTS_BUILD_ROOT;
    process.env.INSIGHTS_BUILD_ROOT = tempRoot;
    const stamp = Date.now();
    for (const leagueId of ["nba", "nhl", "nfl", "epl", "laliga"] as const) {
      writeMinimalLeagueData(tempRoot, leagueId, stamp);
    }
  });

  after(() => {
    if (previousRoot === undefined) {
      delete process.env.INSIGHTS_BUILD_ROOT;
    } else {
      process.env.INSIGHTS_BUILD_ROOT = previousRoot;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("merged payload includes required keys", async () => {
    const payload = await buildOverviewInsightsPayload({ force: true });
    assert.equal(typeof payload.generatedAt, "string");
    assert.ok(Array.isArray(payload.cards));
    assert.ok(Array.isArray(payload.topStories));
    assert.ok(
      payload.topStoriesStatus === "generated" ||
        payload.topStoriesStatus === "fallback",
    );
  });

  it("skips league regeneration when source mtime unchanged", async () => {
    await buildOverviewInsightsPayload({ force: true });
    assert.equal(shouldSkipLeagueRegeneration("nba", false), true);
    assert.equal(getLeagueInsightSourceMtime("nba") > 0, true);

    const dataDir = path.join(tempRoot, "data");
    const future = Date.now() + 60_000;
    const futureSec = future / 1000;
    for (const file of ["ref-stats-core.json", "team-splits.json"]) {
      const filePath = path.join(dataDir, file);
      fs.utimesSync(filePath, futureSec, futureSec);
    }
    assert.equal(shouldSkipLeagueRegeneration("nba", false), false);
  });
});

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  enrichAllLeagueCachedOii,
  enrichRefStatsWithCachedOiiIncremental,
  loadOiiEnrichCache,
} from "./enrich-oii-scores";
import type { RefStatsFile } from "../../src/lib/types";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oii-enrich-"));
  tempDirs.push(dir);
  return dir;
}

function sampleStats(): RefStatsFile {
  return {
    meta: {
      leagueAvgFouls: 41,
      leagueAvgTotal: 220,
      leagueOverBaseline: 0.5,
      seasons: ["2025-26"],
      totalGamesProcessed: 2,
    },
    refs: [
      {
        slug: "ref-a",
        name: "Ref A",
        number: 1,
        games: 20,
        avgTotalPoints: 220,
        overRate: 0.5,
        avgFouls: 41,
        homeCoverRate: null,
        totalPointsDelta: 0,
        foulsDelta: 0,
        seasons: ["2025-26"],
        recentGames: [
          {
            gameId: "g-1",
            date: "2026-04-01",
            season: "2025-26",
            homeTeam: "BOS",
            awayTeam: "NYK",
            totalPoints: 220,
            totalFouls: 40,
            overHit: true,
            raptorsInvolved: false,
          },
        ],
      },
    ],
  };
}

describe("enrich-oii-scores incremental", () => {
  it("skips refs whose fingerprint is unchanged", () => {
    const cache = loadOiiEnrichCache();
    const stats = sampleStats();
    const first = enrichRefStatsWithCachedOiiIncremental(stats, "nba", cache);
    assert.equal(first.updated, 1);
    assert.equal(first.skipped, 0);
    assert.ok(stats.refs[0]?.cached_oii_score != null);

    const second = enrichRefStatsWithCachedOiiIncremental(stats, "nba", cache);
    assert.equal(second.updated, 0);
    assert.equal(second.skipped, 1);
    assert.equal(second.touched, false);
  });

  it("enrichAllLeagueCachedOii writes sidecar cache without touching absent leagues", () => {
    const root = makeTempRoot();
    const dataDir = path.join(root, "data");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, "ref-stats.json"),
      JSON.stringify(sampleStats(), null, 2),
    );

    const first = enrichAllLeagueCachedOii(root);
    assert.equal(first.leagues.length, 1);
    assert.equal(first.leagues[0]?.id, "nba");
    assert.ok((first.leagues[0]?.updated ?? 0) > 0);

    const cachePath = path.join(root, "data/.oii-enrich-cache.json");
    assert.ok(fs.existsSync(cachePath));

    const second = enrichAllLeagueCachedOii(root);
    assert.equal(second.leagues[0]?.updated, 0);
    assert.ok((second.leagues[0]?.skipped ?? 0) > 0);
  });
});

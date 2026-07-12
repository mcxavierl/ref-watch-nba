#!/usr/bin/env npx tsx
/**
 * Pre-deploy gate — catches regressions that broke live leagues (2026-07-10):
 * - slim ref-stats-core shipped without matching team-splits.json
 * - matrix baselines 0-0 / missing bottom-10 panels
 * - verified leagues missing from nav header
 * - Worker layouts not preloading ref-stats + team splits
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { PRODUCTION_LIVE_HEADER_LEAGUE_IDS } from "../src/lib/live-header-leagues.generated";
import { VERIFIED_LIVE_LEAGUE_IDS } from "../src/lib/league-verification";
import {
  MATRIX_MIN_GAMES,
} from "../src/lib/ref-team-matrix";
import { getBaselinesFile } from "../src/lib/baselines";
import { seasonRowsFromBaselines } from "../src/lib/trends";
import { getTeamSampleRecord } from "../src/lib/teamRecord";
import type { RefStatsFile, TeamCrewSplit } from "../src/lib/types";
import { splitRefStatsForDeploy } from "./lib/split-ref-stats";
import { runVolumeRegressionChecks } from "./lib/volume-regression";

const ROOT = process.cwd();

type LiveLeague = (typeof VERIFIED_LIVE_LEAGUE_IDS)[number];

const SAMPLE_TEAMS: Record<LiveLeague, string> = {
  nba: "LAL",
  nhl: "WPG",
  nfl: "KC",
  epl: "ARS",
  laliga: "BAR",
};

const MIN_TEAM_SPLIT_TEAMS: Record<LiveLeague, number> = {
  nba: 25,
  nhl: 28,
  nfl: 28,
  epl: 15,
  laliga: 15,
};

const MIN_SAMPLE_BASELINE_GAMES: Record<LiveLeague, number> = {
  nba: 20,
  nhl: 20,
  nfl: 20,
  epl: 20,
  laliga: 20,
};


const failures: string[] = [];

function fail(msg: string): void {
  failures.push(msg);
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

function nonEmptySplitTeams(splits: Record<string, TeamCrewSplit[]>): number {
  return Object.values(splits).filter((rows) => rows.length > 0).length;
}

function checkDeployArtifacts(league: LiveLeague): void {
  const publicCore =
    league === "nba"
      ? "public/data/nba/ref-stats.json"
      : `public/data/${league}/ref-stats.json`;
  const publicSplitsPath =
    league === "nba"
      ? "public/data/nba/team-splits.json"
      : `public/data/${league}/team-splits.json`;
  const dataCore =
    league === "nba" ? "data/ref-stats-core.json" : `data/${league}/ref-stats-core.json`;
  const dataSplits =
    league === "nba" ? "data/team-splits.json" : `data/${league}/team-splits.json`;
  const sourceStats =
    league === "nba" ? "data/ref-stats.json" : `data/${league}/ref-stats.json`;

  for (const rel of [publicCore, publicSplitsPath, dataCore, dataSplits]) {
    if (!fileExists(rel)) {
      fail(`${league}: missing deploy artifact ${rel}`);
    }
  }

  const source = readJson<RefStatsFile>(sourceStats);
  if (!source?.meta?.data_verified) {
    fail(`${league}: source ${sourceStats} is not data_verified`);
    return;
  }

  const publicCoreStats = readJson<RefStatsFile>(publicCore);
  const publicSplits = readJson<Record<string, TeamCrewSplit[]>>(publicSplitsPath);
  if (!publicCoreStats?.refs?.length) {
    fail(`${league}: ${publicCore} has no refs`);
  }
  if (!publicSplits || nonEmptySplitTeams(publicSplits) === 0) {
    fail(`${league}: ${publicSplitsPath} has no team split rows`);
  }

  if (publicCoreStats) {
    const embedded = nonEmptySplitTeams(publicCoreStats.teamSplits ?? {});
    if (embedded > 0) {
      fail(
        `${league}: ${publicCore} still embeds ${embedded} team split keys — must use sidecar team-splits.json`,
      );
    }
    if (!publicCoreStats.meta.data_verified) {
      fail(`${league}: public core meta.data_verified is false`);
    }
    if (publicCoreStats.meta.data_source === "synthetic") {
      fail(`${league}: public core meta.data_source is synthetic`);
    }
  }

  if (publicSplits) {
    const teamCount = nonEmptySplitTeams(publicSplits);
    if (teamCount < MIN_TEAM_SPLIT_TEAMS[league]) {
      fail(
        `${league}: team-splits has ${teamCount} teams (need >= ${MIN_TEAM_SPLIT_TEAMS[league]})`,
      );
    }

    const sample = SAMPLE_TEAMS[league];
    const sampleGames = getTeamSampleRecord(publicSplits[sample] ?? []).games;
    if (sampleGames < MIN_SAMPLE_BASELINE_GAMES[league]) {
      fail(
        `${league}: sample team ${sample} has ${sampleGames} baseline games in team-splits (need >= ${MIN_SAMPLE_BASELINE_GAMES[league]})`,
      );
    }
  }

  if (source && publicSplits) {
    const { core, teamSplits } = splitRefStatsForDeploy(source);
    const sourceTeams = nonEmptySplitTeams(teamSplits);
    const publicTeams = nonEmptySplitTeams(publicSplits);
    if (sourceTeams !== publicTeams) {
      fail(
        `${league}: team-splits team count mismatch (source ${sourceTeams} vs public ${publicTeams})`,
      );
    }
    const embeddedAfterSplit = nonEmptySplitTeams(core.teamSplits ?? {});
    if (embeddedAfterSplit !== 0) {
      fail(`${league}: splitRefStatsForDeploy left ${embeddedAfterSplit} embedded team keys`);
    }
  }
}

function checkLiveHeader(): void {
  for (const league of VERIFIED_LIVE_LEAGUE_IDS) {
    if (!(PRODUCTION_LIVE_HEADER_LEAGUE_IDS as readonly string[]).includes(league)) {
      fail(
        `live header missing verified league "${league}" (have: ${PRODUCTION_LIVE_HEADER_LEAGUE_IDS.join(", ")})`,
      );
    }
  }
}

function checkWorkerPreloadContract(): void {
  const edgePreload = fs.readFileSync(
    path.join(ROOT, "src/lib/edge-preload.ts"),
    "utf8",
  );
  if (!edgePreload.includes("team-splits.json")) {
    fail("edge-preload.ts must fetch team-splits.json assets");
  }
  if (
    !edgePreload.includes("mergeCachedLeagueRefStats") &&
    !edgePreload.includes("attachTeamSplits")
  ) {
    fail("edge-preload.ts must merge team splits into ref-stats cache after preload");
  }

  for (const league of ["nhl", "nfl", "epl", "laliga", "nba"] as const) {
    const layoutPath = path.join(ROOT, `src/app/${league}/layout.tsx`);
    const layout = fs.readFileSync(layoutPath, "utf8");
    if (!layout.includes("preloadLeagueRefStats")) {
      fail(`${league} layout must await preloadLeagueRefStats before rendering`);
    }
  }
}

function checkTrendsBaselines(): void {
  if (!fileExists("data/baselines.json")) {
    fail("missing data/baselines.json");
    return;
  }
  if (!fileExists("public/data/baselines.json")) {
    fail("missing public/data/baselines.json (copy-data-to-public must publish it)");
  }

  const baselines = getBaselinesFile();
  const liveDataLeagues = {
    nba: "NBA",
    nhl: "NHL",
    nfl: "NFL",
    epl: "EPL",
    laliga: "LALIGA",
  } as const;

  for (const [league, dataLeague] of Object.entries(liveDataLeagues)) {
    const block = baselines[dataLeague];
    const rows = seasonRowsFromBaselines(block.seasons);
    for (const row of rows) {
      if (!row.season || row.gameCount <= 0) {
        fail(`${league}: trend row missing season/gamesCount`);
      }
      if (!(row.leagueAvgTotal > 0) || !(row.leagueAvgFouls > 0)) {
        fail(
          `${league}: trend row ${row.season} has empty scoring/whistle fields`,
        );
      }
    }
  }

  if (MATRIX_MIN_GAMES !== 8) {
    fail(`MATRIX_MIN_GAMES must be 8 (found ${MATRIX_MIN_GAMES})`);
  }
}

function checkOverviewSnapshot(): void {
  const snapshotPath = path.join(ROOT, "data/overview-snapshot.json");
  if (!fs.existsSync(snapshotPath)) {
    fail("data/overview-snapshot.json missing — run scripts/build-overview-snapshot.ts");
    return;
  }
  const file = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as {
    snapshot?: {
      totalRefs?: number;
      insightCards?: unknown[];
      allRefs?: unknown[];
    };
  };
  const snapshot = file.snapshot;
  if (!snapshot) {
    fail("overview-snapshot.json missing snapshot payload");
    return;
  }
  if ((snapshot.insightCards?.length ?? 0) < VERIFIED_LIVE_LEAGUE_IDS.length) {
    fail(
      `overview-snapshot.json has ${snapshot.insightCards?.length ?? 0} insight cards (need ${VERIFIED_LIVE_LEAGUE_IDS.length})`,
    );
  }
  if ((snapshot.totalRefs ?? 0) < 400) {
    fail(`overview-snapshot.json totalRefs=${snapshot.totalRefs ?? 0} (need >= 400)`);
  }
  if ((snapshot.allRefs?.length ?? 0) < 400) {
    fail(`overview-snapshot.json allRefs=${snapshot.allRefs?.length ?? 0} (need >= 400)`);
  }
}

function checkLegacyPublicAliases(): void {
  const aliases = [
    "public/data/ref-stats.json",
    "public/data/team-splits.json",
    "public/data/game-logs.json",
    "public/data/overview/snapshot.json",
  ];
  for (const rel of aliases) {
    if (!fileExists(rel)) {
      fail(`missing legacy public alias ${rel}`);
    }
  }
}

console.log("Deploy readiness check…");
checkLiveHeader();
checkWorkerPreloadContract();
checkOverviewSnapshot();
checkLegacyPublicAliases();
for (const league of VERIFIED_LIVE_LEAGUE_IDS) {
  checkDeployArtifacts(league);
}
const volume = runVolumeRegressionChecks(ROOT);
for (const f of volume.failures) {
  fail(f);
}
checkTrendsBaselines();

if (failures.length > 0) {
  console.error("\nDeploy readiness check FAILED:\n");
  for (const f of failures) {
    console.error(`  ✗ ${f}`);
  }
  console.error(
    `\n${failures.length} issue(s). Fix before deploy — see scripts/check-deploy-readiness.ts`,
  );
  process.exit(1);
}

console.log(
  `Deploy readiness check passed (${VERIFIED_LIVE_LEAGUE_IDS.length} live leagues, artifacts + matrix panels + trends OK).`,
);

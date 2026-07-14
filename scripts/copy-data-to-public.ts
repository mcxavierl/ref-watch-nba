#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { mergeMarketLinesForActiveLeagues } from "./lib/game-logs";
import { NBA_TEN_SEASONS } from "./lib/ten-season-policy";
import { splitRefStatsForDeploy } from "./lib/split-ref-stats";
import { hasNcaaLiveConferenceCoverage } from "../src/lib/ncaa-conference-gate";
import { PRO_VERIFIED_LIVE_LEAGUE_IDS } from "../src/lib/verified-live-leagues";
import type { RefStatsFile } from "../src/lib/types";

const NBA_INGEST_SEASONS = [...NBA_TEN_SEASONS] as const;

function writeMinifiedJson(dest: string, data: unknown): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify(data)}\n`);
  console.log(`Wrote ${dest} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
}

function copyRefStatsCore(root: string): void {
  const fullPath = path.join(root, "data", "ref-stats.json");
  if (!fs.existsSync(fullPath)) return;

  const full = JSON.parse(fs.readFileSync(fullPath, "utf8")) as import("../src/lib/types").RefStatsFile;
  const { core, teamSplits } = splitRefStatsForDeploy(full);

  writeMinifiedJson(path.join(root, "data", "ref-stats-core.json"), core);
  writeMinifiedJson(path.join(root, "data", "team-splits.json"), teamSplits);
  writeMinifiedJson(path.join(root, "public", "data", "nba", "ref-stats.json"), core);
  writeMinifiedJson(path.join(root, "public", "data", "nba", "team-splits.json"), teamSplits);
}

function copyLeagueRefStatsSplit(
  root: string,
  league: "nhl" | "nfl" | "epl" | "laliga" | "cbb",
): void {
  const leagueDir = path.join(root, "data", league);
  const publicDir = path.join(root, "public", "data", league);
  const fullPath = path.join(leagueDir, "ref-stats.json");
  if (!fs.existsSync(fullPath)) return;

  const full = JSON.parse(fs.readFileSync(fullPath, "utf8")) as import("../src/lib/types").RefStatsFile;
  const { core, teamSplits } = splitRefStatsForDeploy(full);

  writeMinifiedJson(path.join(leagueDir, "ref-stats-core.json"), core);
  writeMinifiedJson(path.join(leagueDir, "team-splits.json"), teamSplits);
  writeMinifiedJson(path.join(publicDir, "ref-stats.json"), core);
  writeMinifiedJson(path.join(publicDir, "team-splits.json"), teamSplits);
}

function copyPair(srcDir: string, destDir: string, basename: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of [`${basename}.json`, `${basename}.seed.json`]) {
    const src = path.join(srcDir, file);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(destDir, file));
    console.log(`Copied ${src} → ${path.join(destDir, file)}`);
  }
}

function copyNbaVerifiedIngest(root: string): boolean {
  const nbaData = path.join(root, "data", "nba");
  const nbaPublic = path.join(root, "public", "data", "nba");
  const manifestPath = path.join(nbaData, "manifest.json");
  if (!fs.existsSync(manifestPath)) return false;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    data_verified?: boolean;
    data_source?: string;
    last_ingested_at?: string;
  };
  if (!manifest.data_verified) return false;

  fs.mkdirSync(nbaPublic, { recursive: true });
  fs.copyFileSync(manifestPath, path.join(nbaPublic, "manifest.json"));
  console.log(`Copied ${manifestPath} → ${path.join(nbaPublic, "manifest.json")}`);

  const shardDir = path.join(nbaData, "game-logs");
  const publicShardDir = path.join(nbaPublic, "game-logs");
  fs.mkdirSync(publicShardDir, { recursive: true });

  const games: unknown[] = [];
  for (const season of NBA_INGEST_SEASONS) {
    const shard = path.join(shardDir, `${season}.ndjson`);
    if (!fs.existsSync(shard)) {
      console.warn(`Missing verified shard ${shard}`);
      return false;
    }
    fs.copyFileSync(shard, path.join(publicShardDir, `${season}.ndjson`));
    console.log(`Copied ${shard} → ${path.join(publicShardDir, `${season}.ndjson`)}`);

    for (const line of fs.readFileSync(shard, "utf8").split("\n")) {
      if (!line.trim()) continue;
      games.push(JSON.parse(line));
    }
  }

  games.sort((a, b) => {
    const ga = a as { date: string; gameId: string };
    const gb = b as { date: string; gameId: string };
    return ga.date.localeCompare(gb.date) || ga.gameId.localeCompare(gb.gameId);
  });

  const consolidated = {
    lastUpdated: manifest.last_ingested_at ?? new Date().toISOString(),
    league: "NBA",
    source: manifest.data_source ?? "Basketball-Reference + NBA Stats API",
    games,
  };
  const gameLogsDest = path.join(nbaPublic, "game-logs.json");
  fs.writeFileSync(gameLogsDest, `${JSON.stringify(consolidated, null, 2)}\n`);
  console.log(
    `Built verified game-logs.json (${games.length} games) → ${gameLogsDest}`,
  );
  return true;
}

const root = process.cwd();
mergeMarketLinesForActiveLeagues(root);
copyRefStatsCore(root);
const usedVerifiedNba = copyNbaVerifiedIngest(root);
if (!usedVerifiedNba) {
  copyPair(path.join(root, "data"), path.join(root, "public/data/nba"), "game-logs");
}
// ref-stats: slim core for Worker SSR hydration; teamSplits served separately
copyLeagueRefStatsSplit(root, "nhl");
copyLeagueRefStatsSplit(root, "nfl");
copyLeagueRefStatsSplit(root, "epl");
copyLeagueRefStatsSplit(root, "laliga");
copyLeagueRefStatsSplit(root, "cbb");
copyPair(path.join(root, "data"), path.join(root, "public/data"), "baselines");
copyPair(path.join(root, "data/nhl"), path.join(root, "public/data/nhl"), "game-logs");
copyPair(path.join(root, "data/nhl"), path.join(root, "public/data/nhl"), "ref-photos");
copyPair(path.join(root, "data/nfl"), path.join(root, "public/data/nfl"), "game-logs");
copyPair(path.join(root, "data/nfl"), path.join(root, "public/data/nfl"), "ref-photos");
const nflSuperBowl = path.join(root, "data/nfl/super-bowl-officiating.json");
if (fs.existsSync(nflSuperBowl)) {
  const dest = path.join(root, "public/data/nfl/super-bowl-officiating.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(nflSuperBowl, dest);
  console.log(`Copied ${nflSuperBowl} → ${dest}`);
}
copyPair(path.join(root, "data/nba"), path.join(root, "public/data/nba"), "ref-photos");
for (const league of ["nba", "nfl", "nhl"] as const) {
  const personnel = path.join(root, `data/${league}/personnel-profiles.json`);
  if (fs.existsSync(personnel)) {
    const dest = path.join(root, `public/data/${league}/personnel-profiles.json`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(personnel, dest);
    console.log(`Copied ${personnel} → ${dest}`);
  }
}
const ncaaPersonnel = path.join(root, "data/ncaa/personnel-profiles.json");
if (fs.existsSync(ncaaPersonnel)) {
  const dest = path.join(root, "public/data/ncaa/personnel-profiles.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(ncaaPersonnel, dest);
  console.log(`Copied ${ncaaPersonnel} → ${dest}`);
}
copyLeagueRefStatsSplit(root, "cfb");
copyPair(path.join(root, "data/cfb"), path.join(root, "public/data/cfb"), "game-logs");
copyPair(path.join(root, "data/cfb"), path.join(root, "public/data/cfb"), "build-state");
copyPair(path.join(root, "data/cbb"), path.join(root, "public/data/cbb"), "game-logs");
copyPair(path.join(root, "data/epl"), path.join(root, "public/data/epl"), "game-logs");
copyPair(path.join(root, "data/epl"), path.join(root, "public/data/epl"), "ref-photos");
copyPair(path.join(root, "data/laliga"), path.join(root, "public/data/laliga"), "game-logs");

const nflAssignments = path.join(root, "data/nfl/assignments.json");
if (fs.existsSync(nflAssignments)) {
  const dest = path.join(root, "public/data/nfl/assignments.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(nflAssignments, dest);
  console.log(`Copied ${nflAssignments} → ${dest}`);
}

const cbbAssignments = path.join(root, "data/cbb/assignments.json");
if (fs.existsSync(cbbAssignments)) {
  const dest = path.join(root, "public/data/cbb/assignments.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(cbbAssignments, dest);
  console.log(`Copied ${cbbAssignments} → ${dest}`);
}

const cfbAssignments = path.join(root, "data/cfb/assignments.json");
if (fs.existsSync(cfbAssignments)) {
  const dest = path.join(root, "public/data/cfb/assignments.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(cfbAssignments, dest);
  console.log(`Copied ${cfbAssignments} → ${dest}`);
}

const eplAssignments = path.join(root, "data/epl/assignments.json");
if (fs.existsSync(eplAssignments)) {
  const dest = path.join(root, "public/data/epl/assignments.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(eplAssignments, dest);
  console.log(`Copied ${eplAssignments} → ${dest}`);
}

function writeLiveHeaderLeagues(): void {
  const leagues = [...PRO_VERIFIED_LIVE_LEAGUE_IDS];

  const outPath = path.join(root, "src/lib/live-header-leagues.generated.ts");
  const body = `/** Generated by scripts/copy-data-to-public.ts — do not edit. */
export const PRODUCTION_LIVE_HEADER_LEAGUE_IDS = ${JSON.stringify(leagues, null, 2).replace(/\n/g, "\n")} as const;
`;
  fs.writeFileSync(outPath, body);
  console.log(`Wrote ${outPath}: ${leagues.join(", ")}`);
}

function writeNcaaLiveLeagues(): void {
  const live: ("cbb" | "cfb")[] = [];

  for (const league of ["cbb", "cfb"] as const) {
    const candidates = [
      path.join(root, "data", league, "ref-stats-core.json"),
      path.join(root, "data", league, "ref-stats.json"),
    ];
    let stats: RefStatsFile | null = null;
    for (const candidate of candidates) {
      if (!fs.existsSync(candidate)) continue;
      stats = JSON.parse(fs.readFileSync(candidate, "utf8")) as RefStatsFile;
      break;
    }
    if (hasNcaaLiveConferenceCoverage(league, stats)) {
      live.push(league);
    }
  }

  const outPath = path.join(root, "src/lib/ncaa-live-leagues.generated.ts");
  const body = `/** Generated by scripts/copy-data-to-public.ts — do not edit. */
export const NCAA_LIVE_LEAGUE_IDS = ${JSON.stringify(live, null, 2).replace(/\n/g, "\n")} as const;
`;
  fs.writeFileSync(outPath, body);
  console.log(`Wrote ${outPath}: ${live.join(", ") || "(none)"}`);
}

function writeLeagueHeroStats(root: string): void {
  const { formatSeasonScope } = require("../src/lib/season-scope") as typeof import("../src/lib/season-scope");

  const entries: Record<
    string,
    { officials: number; games: number; seasonSpan: string }
  > = {};

  const sources: { id: string; path: string }[] = [
    { id: "nba", path: path.join(root, "data", "ref-stats-core.json") },
    { id: "nfl", path: path.join(root, "data", "nfl", "ref-stats-core.json") },
    { id: "nhl", path: path.join(root, "data", "nhl", "ref-stats-core.json") },
    { id: "epl", path: path.join(root, "data", "epl", "ref-stats-core.json") },
    { id: "laliga", path: path.join(root, "data", "laliga", "ref-stats-core.json") },
    { id: "cbb", path: path.join(root, "data", "cbb", "ref-stats-core.json") },
    { id: "cfb", path: path.join(root, "data", "cfb", "ref-stats-core.json") },
  ];

  for (const { id, path: statsPath } of sources) {
    if (!fs.existsSync(statsPath)) continue;
    const data = JSON.parse(fs.readFileSync(statsPath, "utf8")) as {
      refs?: unknown[];
      meta?: { totalGamesProcessed?: number; seasons?: string[] };
    };
    const seasons = data.meta?.seasons ?? [];
    entries[id] = {
      officials: data.refs?.length ?? 0,
      games: data.meta?.totalGamesProcessed ?? 0,
      seasonSpan: formatSeasonScope(seasons.length),
    };
  }

  const outPath = path.join(root, "src/lib/league-hero-stats.generated.ts");
  const body = `/** Generated by scripts/copy-data-to-public.ts — do not edit. */
export type LeagueHeroStatsSnapshot = {
  officials: number;
  games: number;
  seasonSpan: string;
};

export const LEAGUE_HERO_STATS: Record<string, LeagueHeroStatsSnapshot> = ${JSON.stringify(entries, null, 2)};
`;
  fs.writeFileSync(outPath, body);
  console.log(`Wrote ${outPath}`);
}

function copyInsightsToPublic(root: string): void {
  const source = path.join(root, "data", "overview-insights.json");
  const dest = path.join(root, "public", "data", "insights.json");
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);
  console.log(`Copied ${source} → ${dest}`);
}

writeLiveHeaderLeagues();
writeNcaaLiveLeagues();
writeLeagueHeroStats(root);
copyInsightsToPublic(root);

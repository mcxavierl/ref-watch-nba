#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { NBA_TEN_SEASONS } from "./lib/ten-season-policy";

const NBA_INGEST_SEASONS = [...NBA_TEN_SEASONS] as const;

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
const usedVerifiedNba = copyNbaVerifiedIngest(root);
if (!usedVerifiedNba) {
  copyPair(path.join(root, "data"), path.join(root, "public/data/nba"), "game-logs");
}
copyPair(path.join(root, "data"), path.join(root, "public/data/nba"), "ref-stats");
copyPair(path.join(root, "data/nhl"), path.join(root, "public/data/nhl"), "ref-stats");
copyPair(path.join(root, "data/nhl"), path.join(root, "public/data/nhl"), "game-logs");
copyPair(path.join(root, "data/nhl"), path.join(root, "public/data/nhl"), "ref-photos");
copyPair(path.join(root, "data/nfl"), path.join(root, "public/data/nfl"), "ref-stats");
copyPair(path.join(root, "data/nfl"), path.join(root, "public/data/nfl"), "game-logs");
copyPair(path.join(root, "data/nfl"), path.join(root, "public/data/nfl"), "ref-photos");
copyPair(path.join(root, "data/cbb"), path.join(root, "public/data/cbb"), "ref-stats");
copyPair(path.join(root, "data/cfb"), path.join(root, "public/data/cfb"), "ref-stats");
copyPair(path.join(root, "data/epl"), path.join(root, "public/data/epl"), "ref-stats");
copyPair(path.join(root, "data/epl"), path.join(root, "public/data/epl"), "game-logs");
copyPair(path.join(root, "data/epl"), path.join(root, "public/data/epl"), "ref-photos");

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
  const leagues: string[] = [];

  const nbaManifest = path.join(root, "data/nba/manifest.json");
  const nbaStatsPath = path.join(root, "data/ref-stats.json");
  const nbaVerified =
    fs.existsSync(nbaManifest) &&
    (JSON.parse(fs.readFileSync(nbaManifest, "utf8")) as { data_verified?: boolean })
      .data_verified === true;
  const nbaSeeded =
    fs.existsSync(nbaStatsPath) &&
    (JSON.parse(fs.readFileSync(nbaStatsPath, "utf8")) as { meta?: { source?: string } })
      .meta?.source === "seeded";
  if (nbaVerified || nbaSeeded) leagues.push("nba");

  const nhlStatsPath = path.join(root, "data/nhl/ref-stats.json");
  if (fs.existsSync(nhlStatsPath)) {
    const nhl = JSON.parse(fs.readFileSync(nhlStatsPath, "utf8")) as {
      meta?: { source?: string; data_verified?: boolean };
    };
    if (nhl.meta?.source === "nhl-api" && nhl.meta?.data_verified === true) {
      leagues.push("nhl");
    }
  }

  const nflStatsPath = path.join(root, "data/nfl/ref-stats.json");
  if (fs.existsSync(nflStatsPath)) {
    const nfl = JSON.parse(fs.readFileSync(nflStatsPath, "utf8")) as {
      meta?: { source?: string; data_verified?: boolean };
    };
    const nflVerified =
      nfl.meta?.data_verified === true &&
      (nfl.meta?.source === "espn" || nfl.meta?.source === "hybrid");
    if (nflVerified) leagues.push("nfl");
  }

  const eplStatsPath = path.join(root, "data/epl/ref-stats.json");
  if (fs.existsSync(eplStatsPath)) {
    const epl = JSON.parse(fs.readFileSync(eplStatsPath, "utf8")) as {
      meta?: { source?: string; data_verified?: boolean };
    };
    const eplVerified =
      epl.meta?.data_verified === true &&
      (epl.meta?.source === "espn" || epl.meta?.source === "hybrid");
    if (eplVerified) leagues.push("epl");
  }

  if (leagues.length === 0) leagues.push("nba");

  const outPath = path.join(root, "src/lib/live-header-leagues.generated.ts");
  const body = `/** Generated by scripts/copy-data-to-public.ts — do not edit. */
export const PRODUCTION_LIVE_HEADER_LEAGUE_IDS = ${JSON.stringify(leagues, null, 2).replace(/\n/g, "\n")} as const;
`;
  fs.writeFileSync(outPath, body);
  console.log(`Wrote ${outPath}: ${leagues.join(", ")}`);
}

writeLiveHeaderLeagues();

#!/usr/bin/env npx tsx
/**
 * Rebuild ref.games from DISTINCT game_id rows in stored game logs.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { loadGameLogs } from "./lib/game-logs";
import { rebuildRefGamesFromLogs } from "./lib/rebuild-ref-games-from-logs";
import { splitRefStatsForDeploy } from "./lib/split-ref-stats";
import type { RefStatsFile } from "./lib/types";

const ROOT = process.cwd();

const LEAGUES: {
  id: string;
  statsPath: string;
  useCanonicalKey: boolean;
}[] = [
  { id: "nba", statsPath: "data/ref-stats.json", useCanonicalKey: true },
  { id: "nfl", statsPath: "data/nfl/ref-stats.json", useCanonicalKey: false },
  { id: "nhl", statsPath: "data/nhl/ref-stats.json", useCanonicalKey: false },
  { id: "epl", statsPath: "data/epl/ref-stats.json", useCanonicalKey: false },
  { id: "laliga", statsPath: "data/laliga/ref-stats.json", useCanonicalKey: false },
  { id: "cbb", statsPath: "data/cbb/ref-stats.json", useCanonicalKey: false },
  { id: "cfb", statsPath: "data/cfb/ref-stats.json", useCanonicalKey: false },
];

function writeJson(rel: string, data: unknown): void {
  const dest = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify(data, null, 2)}\n`);
}

function main(): void {
  console.log("=== Rebuild ref game counts from game logs ===\n");

  for (const league of LEAGUES) {
    const statsPath = path.join(ROOT, league.statsPath);
    if (!fs.existsSync(statsPath)) {
      console.warn(`Skip ${league.id}: missing ${league.statsPath}`);
      continue;
    }

    const dataLeague = league.id.toUpperCase() as
      | "NBA"
      | "NFL"
      | "NHL"
      | "EPL"
      | "LALIGA"
      | "CBB"
      | "CFB";
    const logs = loadGameLogs(dataLeague);
    if (!logs || logs.games.length === 0) {
      console.warn(`Skip ${league.id}: no game logs`);
      continue;
    }

    const before = JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;
    const sampleBefore = before.refs[0];
    const rebuilt = rebuildRefGamesFromLogs(before, logs, {
      useCanonicalKey: league.useCanonicalKey,
      seasons: before.meta.seasons,
    });
    const sampleAfter = rebuilt.refs.find((ref) => ref.slug === sampleBefore?.slug);

    writeJson(league.statsPath, rebuilt);

    const { core, teamSplits } = splitRefStatsForDeploy(rebuilt);
    const corePath =
      league.id === "nba"
        ? "data/ref-stats-core.json"
        : `data/${league.id}/ref-stats-core.json`;
    const splitsPath =
      league.id === "nba"
        ? "data/team-splits.json"
        : `data/${league.id}/team-splits.json`;
    writeJson(corePath, core);
    writeJson(splitsPath, teamSplits);

    console.log(
      `${league.id}: ${before.refs.length} refs, sample ${sampleBefore?.name ?? "?"} ` +
        `${sampleBefore?.games ?? 0} → ${sampleAfter?.games ?? 0} games`,
    );
  }

  console.log("\nDone.");
}

main();

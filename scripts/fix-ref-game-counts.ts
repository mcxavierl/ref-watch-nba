#!/usr/bin/env npx tsx
/**
 * Rebuild ref.games from DISTINCT game_id rows in stored game logs.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { GameLogFile } from "./lib/game-logs";
import { rebuildRefGamesFromLogs } from "./lib/rebuild-ref-games-from-logs";
import { splitRefStatsForDeploy } from "./lib/split-ref-stats";
import type { RefStatsFile } from "./lib/types";

export interface RefGameCountLeagueConfig {
  id: string;
  statsPath: string;
  gameLogPath: string;
  useCanonicalKey: boolean;
  /** ref-stats-core path used by verify-data-integrity */
  corePath: string;
  /** Max allowed drift between stored ref.games and DISTINCT game_id logs */
  maxDriftPct: number;
}

export const REF_GAME_COUNT_LEAGUES: RefGameCountLeagueConfig[] = [
  {
    id: "nba",
    statsPath: "data/ref-stats.json",
    gameLogPath: "data/game-logs.json",
    useCanonicalKey: true,
    corePath: "data/ref-stats-core.json",
    maxDriftPct: 1,
  },
  {
    id: "nfl",
    statsPath: "data/nfl/ref-stats.json",
    gameLogPath: "data/nfl/game-logs.json",
    useCanonicalKey: true,
    corePath: "data/nfl/ref-stats-core.json",
    maxDriftPct: 3,
  },
  {
    id: "nhl",
    statsPath: "data/nhl/ref-stats.json",
    gameLogPath: "data/nhl/game-logs.json",
    useCanonicalKey: false,
    corePath: "data/nhl/ref-stats-core.json",
    maxDriftPct: 3,
  },
  {
    id: "epl",
    statsPath: "data/epl/ref-stats.json",
    gameLogPath: "data/epl/game-logs.json",
    useCanonicalKey: true,
    corePath: "data/epl/ref-stats-core.json",
    maxDriftPct: 3,
  },
  {
    id: "laliga",
    statsPath: "data/laliga/ref-stats.json",
    gameLogPath: "data/laliga/game-logs.json",
    useCanonicalKey: false,
    corePath: "data/laliga/ref-stats-core.json",
    maxDriftPct: 3,
  },
  {
    id: "cbb",
    statsPath: "data/cbb/ref-stats.json",
    gameLogPath: "data/cbb/game-logs.json",
    useCanonicalKey: false,
    corePath: "data/cbb/ref-stats-core.json",
    maxDriftPct: 3,
  },
  {
    id: "cfb",
    statsPath: "data/cfb/ref-stats.json",
    gameLogPath: "data/cfb/game-logs.json",
    useCanonicalKey: false,
    corePath: "data/cfb/ref-stats-core.json",
    maxDriftPct: 3,
  },
];

function writeJson(root: string, rel: string, data: unknown): void {
  const dest = path.join(root, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify(data, null, 2)}\n`);
}

function loadLeagueGameLogs(root: string, rel: string): GameLogFile | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(root, rel), "utf8"),
    ) as GameLogFile;
  } catch {
    return null;
  }
}

export interface SyncRefGameCountsLeagueResult {
  id: string;
  refCount: number;
  sampleName: string;
  sampleGamesBefore: number;
  sampleGamesAfter: number;
}

export interface SyncRefGameCountsResult {
  leagues: SyncRefGameCountsLeagueResult[];
}

export function syncRefGameCountsFromLogs(
  root?: string,
  options?: { skipLeagues?: string[] },
): SyncRefGameCountsResult {
  const r = root ?? process.cwd();
  const skip = new Set((options?.skipLeagues ?? []).map((id) => id.toLowerCase()));
  const leagues: SyncRefGameCountsLeagueResult[] = [];

  for (const league of REF_GAME_COUNT_LEAGUES) {
    if (skip.has(league.id)) continue;

    const statsPath = path.join(r, league.statsPath);
    if (!fs.existsSync(statsPath)) continue;

    const logs = loadLeagueGameLogs(r, league.gameLogPath);
    if (!logs || logs.games.length === 0) continue;

    const before = JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;
    const sampleBefore = before.refs[0];
    const rebuilt = rebuildRefGamesFromLogs(before, logs, {
      useCanonicalKey: league.useCanonicalKey,
      seasons: before.meta.seasons,
    });
    const sampleAfter = rebuilt.refs.find((ref) => ref.slug === sampleBefore?.slug);

    writeJson(r, league.statsPath, rebuilt);

    const { core, teamSplits } = splitRefStatsForDeploy(rebuilt);
    const corePath =
      league.id === "nba"
        ? "data/ref-stats-core.json"
        : `data/${league.id}/ref-stats-core.json`;
    const splitsPath =
      league.id === "nba"
        ? "data/team-splits.json"
        : `data/${league.id}/team-splits.json`;
    writeJson(r, corePath, core);
    writeJson(r, splitsPath, teamSplits);

    leagues.push({
      id: league.id,
      refCount: rebuilt.refs.length,
      sampleName: sampleBefore?.name ?? "?",
      sampleGamesBefore: sampleBefore?.games ?? 0,
      sampleGamesAfter: sampleAfter?.games ?? 0,
    });
  }

  return { leagues };
}

function main(): void {
  console.log("=== Rebuild ref game counts from game logs ===\n");

  const result = syncRefGameCountsFromLogs();
  for (const league of result.leagues) {
    console.log(
      `${league.id}: ${league.refCount} refs, sample ${league.sampleName} ` +
        `${league.sampleGamesBefore} → ${league.sampleGamesAfter} games`,
    );
  }

  console.log("\nDone.");
}

if (import.meta.url.startsWith("file:")) {
  const executed = path.resolve(process.argv[1] ?? "");
  const modulePath = path.resolve(new URL(import.meta.url).pathname);
  if (executed === modulePath) {
    main();
  }
}

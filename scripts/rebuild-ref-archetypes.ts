#!/usr/bin/env npx tsx
/**
 * Attach Ref-Intelligence archetype personas to ref profiles from game logs.
 *
 * Usage: npm run rebuild-ref-archetypes
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { attachRefArchetypesFromGames } from "./lib/attach-ref-archetypes";
import { loadGameLogs } from "./lib/game-logs";
import type { LeagueId } from "../src/lib/leagues";
import type { RefProfile, RefStatsFile } from "../src/lib/types";

const ROOT = process.cwd();

const ARCHETYPE_LEAGUES: Array<{
  leagueId: LeagueId;
  dataLeague: "NBA" | "NFL" | "NHL" | "EPL" | "LALIGA" | "WNBA";
}> = [
  { leagueId: "nba", dataLeague: "NBA" },
  { leagueId: "nfl", dataLeague: "NFL" },
  { leagueId: "nhl", dataLeague: "NHL" },
  { leagueId: "epl", dataLeague: "EPL" },
  { leagueId: "laliga", dataLeague: "LALIGA" },
  { leagueId: "wnba", dataLeague: "WNBA" },
];

function statsPathForLeague(leagueId: LeagueId): string {
  if (leagueId === "nba") {
    return path.join(ROOT, "data", "ref-stats.json");
  }
  return path.join(ROOT, "data", leagueId, "ref-stats.json");
}

function corePathForLeague(leagueId: LeagueId): string | null {
  if (leagueId === "nba") {
    return path.join(ROOT, "data", "ref-stats-core.json");
  }
  return path.join(ROOT, "data", leagueId, "ref-stats-core.json");
}

function rebuildLeagueArchetypes(leagueId: LeagueId, dataLeague: "NBA" | "NFL" | "NHL" | "EPL" | "LALIGA" | "WNBA"): number {
  const statsPath = statsPathForLeague(leagueId);
  if (!fs.existsSync(statsPath)) {
    console.log(`skip ${leagueId}: missing ${statsPath}`);
    return 0;
  }

  const logs = loadGameLogs(dataLeague);
  if (!logs?.games?.length) {
    console.log(`skip ${leagueId}: no game logs`);
    return 0;
  }

  const stats = JSON.parse(fs.readFileSync(statsPath, "utf8")) as RefStatsFile;
  const updatedRefs = attachRefArchetypesFromGames(stats.refs, logs.games, leagueId);
  const tagged = updatedRefs.filter((ref) => ref.officialStats !== undefined).length;

  const nextStats: RefStatsFile = {
    ...stats,
    refs: updatedRefs,
    meta: {
      ...stats.meta,
      lastUpdated: new Date().toISOString(),
    },
  };

  fs.writeFileSync(statsPath, `${JSON.stringify(nextStats, null, 2)}\n`);

  const corePath = corePathForLeague(leagueId);
  if (corePath && fs.existsSync(corePath)) {
    const core = JSON.parse(fs.readFileSync(corePath, "utf8")) as {
      refs: RefProfile[];
      meta: RefStatsFile["meta"];
    };
    const coreBySlug = new Map(updatedRefs.map((ref) => [ref.slug, ref.officialStats]));
    const nextCoreRefs = core.refs.map((ref) => {
      const officialStats = coreBySlug.get(ref.slug);
      return officialStats ? { ...ref, officialStats } : ref;
    });
    fs.writeFileSync(
      corePath,
      `${JSON.stringify({ ...core, refs: nextCoreRefs, meta: nextStats.meta }, null, 2)}\n`,
    );
  }

  console.log(`${leagueId}: attached archetypes to ${tagged}/${updatedRefs.length} refs`);
  return tagged;
}

export function rebuildRefArchetypes(root = ROOT): number {
  let total = 0;
  const previousRoot = process.cwd();
  process.chdir(root);
  try {
    for (const { leagueId, dataLeague } of ARCHETYPE_LEAGUES) {
      total += rebuildLeagueArchetypes(leagueId, dataLeague);
    }
  } finally {
    process.chdir(previousRoot);
  }
  return total;
}

function main(): void {
  console.log("=== Rebuild Ref-Intelligence archetypes ===\n");
  const total = rebuildRefArchetypes();
  console.log(`\nDone. ${total} refs tagged across leagues.`);
}

if (import.meta.url.startsWith("file:")) {
  const executed = path.resolve(process.argv[1] ?? "");
  const modulePath = path.resolve(new URL(import.meta.url).pathname);
  if (executed === modulePath) {
    main();
  }
}

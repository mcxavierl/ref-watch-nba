#!/usr/bin/env npx tsx
/**
 * Repair NFL game-log official names (e.g. ESPN "Clark Land" → "Land Clark"),
 * drop reverse-name ghost profiles, and rebuild ref×team stats from logs.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { loadGameLogs, saveGameLogs } from "../lib/game-logs";
import { applyGameLogTeamStats } from "./lib/rebuild-team-stats-from-logs";
import {
  canonicalizeOfficialName,
  findReverseNameGhosts,
} from "./lib/official-names";
import type { RefStatsFile } from "../../src/lib/types";

const DATA_DIR = path.join(process.cwd(), "data", "nfl");
const STATS_PATH = path.join(DATA_DIR, "ref-stats.json");

function main() {
  const logs = loadGameLogs("NFL");
  if (!logs || logs.games.length === 0) {
    console.error("No NFL game logs found.");
    process.exit(1);
  }

  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) as RefStatsFile;
  const roster = new Map<string, number>();
  for (const ref of stats.refs) {
    if (ref.number <= 0) continue;
    roster.set(
      ref.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z\s]/g, "")
        .trim(),
      ref.number,
    );
  }

  let renamed = 0;
  for (const game of logs.games) {
    for (const official of game.officials) {
      const before = `${official.name}|${official.number}`;
      const canonical = canonicalizeOfficialName(official.name, roster);
      official.name = canonical.name;
      official.number = canonical.number;
      const after = `${official.name}|${official.number}`;
      if (before !== after) renamed++;
    }
  }

  saveGameLogs(logs);
  console.log(`Canonicalized ${renamed} official name slots across ${logs.games.length} games`);

  const rebuilt = applyGameLogTeamStats(stats, logs);
  const ghosts = findReverseNameGhosts(rebuilt.stats.refs);
  const ghostSlugs = new Set(ghosts.map((g) => g.ghostSlug));
  if (ghosts.length > 0) {
    console.log(
      `Dropping ${ghosts.length} reverse-name ghosts: ${ghosts
        .map((g) => `${g.ghostName}→${g.canonName}`)
        .join(", ")}`,
    );
  }

  const cleanedRefs = rebuilt.stats.refs.filter(
    (ref) => !ghostSlugs.has(ref.slug) && ref.games > 0,
  );
  const output: RefStatsFile = {
    ...rebuilt.stats,
    refs: cleanedRefs,
    meta: {
      ...rebuilt.stats.meta,
      refCount: cleanedRefs.length,
      lastUpdated: new Date().toISOString(),
      note:
        `${rebuilt.stats.meta.note ?? ""} Official names canonicalized ` +
        `(${renamed} slots); ${ghosts.length} reverse-name ghosts removed.`,
    },
  };

  fs.writeFileSync(STATS_PATH, `${JSON.stringify(output, null, 2)}\n`);

  const land = output.refs.find((r) => r.slug === "land-clark-130");
  console.log(
    `Land Clark games=${land?.games ?? 0} BUF=${JSON.stringify(land?.teamStats?.BUF ?? null)}`,
  );
  console.log(
    `Wrote ${cleanedRefs.length} officials (was ${stats.refs.length}) → ${STATS_PATH}`,
  );
}

main();

/**
 * Dedupe referee profiles in already-committed ref-stats files.
 *
 * Leagues whose data is built from live feeds (ESPN, etc.) cannot be rebuilt
 * offline, so this applies the canonical-identity merge directly to the JSON.
 *
 * Usage:
 *   tsx scripts/dedupe-ref-profiles.ts                # all known leagues
 *   tsx scripts/dedupe-ref-profiles.ts data/foo.json  # specific file(s)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { RefStatsFile } from "../src/lib/types";
import { mergeDuplicateRefProfiles } from "./lib/merge-duplicate-refs";

const DEFAULT_FILES = [
  "data/ref-stats.json",
  "data/nhl/ref-stats.json",
  "data/nfl/ref-stats.json",
  "data/epl/ref-stats.json",
  "data/cbb/ref-stats.json",
  "data/cfb/ref-stats.json",
];

function dedupeFile(path: string): boolean {
  if (!existsSync(path)) {
    console.log(`  skip (missing): ${path}`);
    return false;
  }
  const stats = JSON.parse(readFileSync(path, "utf8")) as RefStatsFile;
  const before = stats.refs.length;
  const { refs, mergedGroups } = mergeDuplicateRefProfiles(stats.refs, {
    leagueAvgTotal: stats.meta.leagueAvgTotal,
    leagueAvgFouls: stats.meta.leagueAvgFouls,
  });

  if (mergedGroups.length === 0) {
    console.log(`  ${path}: ${before} refs, no duplicates`);
    return false;
  }

  stats.refs = refs;
  if (stats.meta.refCount !== undefined) stats.meta.refCount = refs.length;
  writeFileSync(path, `${JSON.stringify(stats, null, 2)}\n`);
  console.log(`  ${path}: ${before} → ${refs.length} refs`);
  for (const g of mergedGroups) {
    console.log(`      ${g.canonical} ← ${g.from.join(", ")}  (${g.games}g)`);
  }
  return true;
}

function main() {
  const files = process.argv.slice(2);
  const targets = files.length > 0 ? files : DEFAULT_FILES;
  console.log("Deduping referee profiles...");
  let changed = 0;
  for (const path of targets) {
    if (dedupeFile(path)) changed++;
  }
  console.log(`Done. ${changed} file(s) updated.`);
}

main();

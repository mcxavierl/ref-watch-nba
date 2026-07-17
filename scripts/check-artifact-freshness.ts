#!/usr/bin/env npx tsx
/**
 * Guardrail: committed generated JSON must match a fresh build when overview
 * sources change. Skips unrelated PRs so fast parallel work is not blocked.
 */
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { buildCrossLeagueOverview } from "../src/lib/cross-league-overview";
import { catalogCompetitionCount } from "../src/lib/league-catalog";

const ROOT = process.cwd();
const SNAPSHOT_REL = "data/overview-snapshot.json";

const RELEVANT_PATHS = [
  "src/lib/cross-league-overview.ts",
  "src/lib/overview-upcoming-slate.ts",
  "src/lib/overview-matchup-insight.ts",
  "src/lib/overview-slate-shared.ts",
  "src/lib/league-pace-bars.ts",
  "src/lib/league-quick-lists.ts",
  SNAPSHOT_REL,
  "data/overview-insights.json",
];

function gitLines(args: string): string[] {
  try {
    return execSync(`git ${args}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function changedFiles(): Set<string> {
  const base = process.env.GITHUB_BASE_SHA ?? "origin/main";
  const fromBase = gitLines(`diff --name-only ${base}...HEAD`);
  if (fromBase.length > 0) return new Set(fromBase);

  const staged = gitLines("diff --name-only --cached");
  const unstaged = gitLines("diff --name-only");
  return new Set([...staged, ...unstaged]);
}

function isRelevantChange(changed: Set<string>): boolean {
  if (changed.size === 0) return true;
  return [...changed].some((file) => RELEVANT_PATHS.some((rel) => file === rel || file.endsWith(rel)));
}

function readJson<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")) as T;
}

const changed = changedFiles();
if (!isRelevantChange(changed)) {
  console.log("check-artifact-freshness: skipped (no overview snapshot sources changed)");
  process.exit(0);
}

const failures: string[] = [];

if (!fs.existsSync(path.join(ROOT, SNAPSHOT_REL))) {
  failures.push(`${SNAPSHOT_REL} missing — run: npx tsx scripts/build-overview-snapshot.ts`);
} else {
  const onDisk = readJson<{ snapshot: ReturnType<typeof buildCrossLeagueOverview> }>(SNAPSHOT_REL);
  const fresh = buildCrossLeagueOverview(catalogCompetitionCount());

  if (JSON.stringify(onDisk.snapshot) !== JSON.stringify(fresh)) {
    const onDiskParsed = onDisk.snapshot as Record<string, unknown>;
    const freshParsed = fresh as Record<string, unknown>;
    let reason = "payload differs";
    for (const key of Object.keys({ ...onDiskParsed, ...freshParsed })) {
      if (JSON.stringify(onDiskParsed[key]) !== JSON.stringify(freshParsed[key])) {
        reason = `${key} differs`;
        break;
      }
    }
    failures.push(
      `${SNAPSHOT_REL} is stale (${reason}) — run: npx tsx scripts/build-overview-snapshot.ts && git add ${SNAPSHOT_REL}`,
    );
  }
}

if (failures.length > 0) {
  console.error("check-artifact-freshness FAILED:\n");
  for (const msg of failures) {
    console.error(`  ✗ ${msg}`);
  }
  process.exit(1);
}

console.log("check-artifact-freshness: OK");

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
import {
  isOverviewSnapshotSource,
  OVERVIEW_SNAPSHOT_REL,
  OVERVIEW_SNAPSHOT_SOURCES,
} from "./overview-snapshot-sources";

const ROOT = process.cwd();

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
  return [...changed].some((file) => isOverviewSnapshotSource(file) || file.endsWith(OVERVIEW_SNAPSHOT_REL));
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
const touchedSources = [...changed].filter((file) => isOverviewSnapshotSource(file));
const snapshotTouched = [...changed].some((file) => file.endsWith(OVERVIEW_SNAPSHOT_REL));

if (process.env.GITHUB_BASE_SHA && touchedSources.length > 0 && !snapshotTouched) {
  failures.push(
    `overview snapshot sources changed (${touchedSources.join(", ")}) but ${OVERVIEW_SNAPSHOT_REL} was not updated — run: npx tsx scripts/build-overview-snapshot.ts && git add ${OVERVIEW_SNAPSHOT_REL}`,
  );
}

if (!fs.existsSync(path.join(ROOT, OVERVIEW_SNAPSHOT_REL))) {
  failures.push(`${OVERVIEW_SNAPSHOT_REL} missing — run: npx tsx scripts/build-overview-snapshot.ts`);
} else if (failures.length === 0) {
  const onDisk = readJson<{ snapshot: ReturnType<typeof buildCrossLeagueOverview> }>(
    OVERVIEW_SNAPSHOT_REL,
  );
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
      `${OVERVIEW_SNAPSHOT_REL} is stale (${reason}) — run: npx tsx scripts/build-overview-snapshot.ts && git add ${OVERVIEW_SNAPSHOT_REL}`,
    );
  }
}

if (failures.length > 0) {
  console.error("check-artifact-freshness FAILED:\n");
  for (const msg of failures) {
    console.error(`  ✗ ${msg}`);
  }
  console.error(
    `\nTracked overview snapshot sources:\n${OVERVIEW_SNAPSHOT_SOURCES.map((file) => `  - ${file}`).join("\n")}`,
  );
  process.exit(1);
}

console.log("check-artifact-freshness: OK");

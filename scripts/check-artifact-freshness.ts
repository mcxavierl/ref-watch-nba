#!/usr/bin/env npx tsx
/**
 * Guardrail: committed generated JSON must match a fresh build.
 * Prevents merging logic changes while leaving stale overview-snapshot.json on disk.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { buildCrossLeagueOverview } from "../src/lib/cross-league-overview";
import { catalogCompetitionCount } from "../src/lib/league-catalog";

const ROOT = process.cwd();
const failures: string[] = [];

function readJson<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")) as T;
}

function assertSnapshotFresh(): void {
  const rel = "data/overview-snapshot.json";
  if (!fs.existsSync(path.join(ROOT, rel))) {
    failures.push(`${rel} missing — run: npx tsx scripts/build-overview-snapshot.ts`);
    return;
  }

  const onDisk = readJson<{ snapshot: ReturnType<typeof buildCrossLeagueOverview> }>(rel);
  const fresh = buildCrossLeagueOverview(catalogCompetitionCount());

  const onDiskJson = JSON.stringify(onDisk.snapshot);
  const freshJson = JSON.stringify(fresh);
  if (onDiskJson !== freshJson) {
    const onDiskParsed = onDisk.snapshot as Record<string, unknown>;
    const freshParsed = fresh as Record<string, unknown>;
    for (const key of Object.keys({ ...onDiskParsed, ...freshParsed })) {
      if (JSON.stringify(onDiskParsed[key]) !== JSON.stringify(freshParsed[key])) {
        failures.push(
          `${rel} is stale (${key} differs) — run: npx tsx scripts/build-overview-snapshot.ts && git add ${rel}`,
        );
        break;
      }
    }
    if (failures.length === 0) {
      failures.push(
        `${rel} is stale — run: npx tsx scripts/build-overview-snapshot.ts && git add ${rel}`,
      );
    }
  }
}

assertSnapshotFresh();

if (failures.length > 0) {
  console.error("check-artifact-freshness FAILED:\n");
  for (const msg of failures) {
    console.error(`  ✗ ${msg}`);
  }
  process.exit(1);
}

console.log("check-artifact-freshness: OK");

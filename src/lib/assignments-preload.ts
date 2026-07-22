import { fetchStaticJson } from "@/lib/edge-fetch";
import { isAssignmentsPayload } from "@/lib/json-asset-guards";
import { activeLiveLeagueIds } from "@/lib/league-verification";
import type { LeagueId } from "@/lib/leagues";
import { allowNodeDataFs } from "@/lib/production-data-guard";
import type { AssignmentsFile } from "@/lib/types";
import {
  freezeWorkerConfig,
  getWorkerIsolateStore,
  releaseParsedPayload,
} from "@/lib/worker-isolate-store";

const ASSIGNMENTS_ASSET: Partial<Record<LeagueId, readonly string[]>> = freezeWorkerConfig({
  nba: ["/data/nba/assignments.json", "/data/assignments.json"],
  nhl: ["/data/nhl/assignments.json"],
  nfl: ["/data/nfl/assignments.json"],
  epl: ["/data/epl/assignments.json"],
  laliga: ["/data/laliga/assignments.json"],
  wnba: ["/data/wnba/assignments.json"],
  cbb: ["/data/cbb/assignments.json"],
  cfb: ["/data/cfb/assignments.json"],
});

export function assignmentsAssetPaths(leagueId: LeagueId): readonly string[] {
  return ASSIGNMENTS_ASSET[leagueId] ?? [`/data/${leagueId}/assignments.json`];
}

export function getCachedAssignments(leagueId: LeagueId): AssignmentsFile | null {
  return getWorkerIsolateStore().assignments[leagueId] ?? null;
}

export function setCachedAssignments(
  leagueId: LeagueId,
  file: AssignmentsFile,
): void {
  getWorkerIsolateStore().assignments[leagueId] = file;
}

async function fetchAssignmentsAsset(
  origin: string,
  assetPath: string,
): Promise<AssignmentsFile | null> {
  let data: unknown = await fetchStaticJson(origin, assetPath);
  const file = isAssignmentsPayload(data) ? data : null;
  data = releaseParsedPayload(data);
  return file;
}

/** Hydrate one league's assignments from ASSETS when Workers cannot read data/ from disk. */
export async function preloadAssignmentsFromAssets(
  origin: string,
  leagueId: LeagueId,
): Promise<void> {
  if (allowNodeDataFs()) return;
  if (getCachedAssignments(leagueId)) return;
  if (!origin?.trim()) return;

  for (const assetPath of assignmentsAssetPaths(leagueId)) {
    const file = await fetchAssignmentsAsset(origin, assetPath);
    if (file) {
      setCachedAssignments(leagueId, file);
      return;
    }
  }
}

/** Hydrate assignments for every live league (homepage slate + /api/slate). */
export async function preloadAssignmentsForLiveSlate(origin: string): Promise<void> {
  if (allowNodeDataFs()) return;
  if (!origin?.trim()) return;

  for (const leagueId of activeLiveLeagueIds()) {
    try {
      await preloadAssignmentsFromAssets(origin, leagueId);
    } catch (error) {
      console.error("[refwatch] assignments preload failed", leagueId, error);
    }
  }
}

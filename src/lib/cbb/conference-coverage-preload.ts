import { fetchStaticJson, safeOriginFetch } from "@/lib/edge-fetch";
import type { LiveNcaaConferenceId } from "@/lib/ncaa-conference-gate";

export type CbbConferenceCoverageSnapshot = {
  generatedAt: string;
  distinctByConference: Record<LiveNcaaConferenceId, number>;
};

const SNAPSHOT_GLOBAL_KEY = "__REFWATCH_CBB_CONFERENCE_COVERAGE__";
const SNAPSHOT_ASSET_PATH = "/data/cbb/conference-coverage.json";

function readSnapshotGlobal(): CbbConferenceCoverageSnapshot | null {
  return (
    (globalThis as unknown as Record<string, CbbConferenceCoverageSnapshot | undefined>)[
      SNAPSHOT_GLOBAL_KEY
    ] ?? null
  );
}

export function getCachedCbbConferenceCoverage(): CbbConferenceCoverageSnapshot | null {
  return readSnapshotGlobal();
}

export function clearCachedCbbConferenceCoverage(): void {
  delete (globalThis as unknown as Record<string, CbbConferenceCoverageSnapshot | undefined>)[
    SNAPSHOT_GLOBAL_KEY
  ];
}

export function setCachedCbbConferenceCoverage(
  snapshot: CbbConferenceCoverageSnapshot,
): void {
  (globalThis as unknown as Record<string, CbbConferenceCoverageSnapshot | undefined>)[
    SNAPSHOT_GLOBAL_KEY
  ] = snapshot;
}

function isCoverageSnapshot(value: unknown): value is CbbConferenceCoverageSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as CbbConferenceCoverageSnapshot;
  return (
    typeof row.generatedAt === "string" &&
    row.distinctByConference !== null &&
    typeof row.distinctByConference === "object"
  );
}

/** Edge-safe: fetch precomputed conference game counts (~1 KB). */
export async function preloadCbbConferenceCoverageFromAssets(
  origin: string,
): Promise<void> {
  if (getCachedCbbConferenceCoverage()) return;
  if (!origin?.trim()) return;

  try {
    let data: unknown = await fetchStaticJson(origin, SNAPSHOT_ASSET_PATH);
    if (isCoverageSnapshot(data)) {
      setCachedCbbConferenceCoverage(data);
      return;
    }

    const res = await safeOriginFetch(origin, SNAPSHOT_ASSET_PATH);
    if (res?.ok) {
      data = (await res.json()) as unknown;
      if (isCoverageSnapshot(data)) {
        setCachedCbbConferenceCoverage(data);
      }
    }
  } catch {
    // Never fail SSR from coverage preload.
  }
}

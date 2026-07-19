import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

/** NHL API-backed game logs and ref stats - verified scores, PIM, crews. */
export function isNhlVerifiedData(source: string | undefined): boolean {
  return source === "nhl-api" || source === "hybrid";
}

/** Simulated or legacy preview data - not for accuracy claims. */
export function isNhlSimulatedData(source: string | undefined): boolean {
  return source === "seeded" || source === "historical" || source === "synthetic";
}

export function isNhlHybridData(source: string | undefined): boolean {
  return source === "hybrid";
}

export function nhlUsesSimulatedStats(meta: RefStatsFile["meta"]): boolean {
  return isNhlSimulatedData(meta.source) || meta.data_verified !== true;
}

export function nhlAssignmentsAreVerified(
  assignments: Pick<AssignmentsFile, "source" | "games">,
): boolean {
  return assignments.source === "nhl-api" && assignments.games.length > 0;
}

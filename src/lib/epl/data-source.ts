import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

/** Verified match logs and ref stats from external feeds. */
export function isEplVerifiedData(source: string | undefined): boolean {
  return source === "espn" || source === "football-data";
}

/** Simulated or legacy preview data — not for accuracy claims. */
export function isEplSimulatedData(source: string | undefined): boolean {
  return source === "seeded" || source === "historical";
}

export function eplUsesSimulatedStats(meta: RefStatsFile["meta"]): boolean {
  return isEplSimulatedData(meta.source) || !meta.atsAvailable;
}

export function eplAssignmentsAreVerified(
  assignments: Pick<AssignmentsFile, "source" | "games">,
): boolean {
  return assignments.source === "espn" && assignments.games.length > 0;
}

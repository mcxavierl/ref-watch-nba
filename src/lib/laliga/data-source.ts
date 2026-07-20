import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

export function isLaligaVerifiedData(source: string | undefined): boolean {
  return source === "espn";
}

export function isLaligaSimulatedData(source: string | undefined): boolean {
  return source === "seeded" || source === "historical";
}

export function laligaUsesSimulatedStats(meta: RefStatsFile["meta"]): boolean {
  return isLaligaSimulatedData(meta.source) || !meta.atsAvailable;
}

export function laligaAssignmentsAreVerified(
  assignments: Pick<AssignmentsFile, "source" | "games">,
): boolean {
  return assignments.source === "espn" && assignments.games.length > 0;
}

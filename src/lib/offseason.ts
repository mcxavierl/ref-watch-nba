import type { AssignmentsFile } from "@/lib/types";

/** True when there are no official assignments for today (offseason or between slates). */
export function isOffseasonSlate(assignments: AssignmentsFile): boolean {
  return assignments.games.length === 0;
}

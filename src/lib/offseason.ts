import type { AssignmentGame, AssignmentsFile } from "@/lib/types";

function scheduledMatchups(assignments: AssignmentsFile): AssignmentGame[] {
  const fromField = assignments.scheduledGames ?? [];
  const fromEmptyCrew = assignments.games.filter((game) => game.crew.length === 0);
  const seen = new Set<string>();
  const merged: AssignmentGame[] = [];
  for (const game of [...fromField, ...fromEmptyCrew]) {
    if (seen.has(game.id)) continue;
    seen.add(game.id);
    merged.push(game);
  }
  return merged;
}

/** Games with a published crew for tonight / this matchday. */
export function hasPublishedCrews(assignments: AssignmentsFile): boolean {
  return assignments.games.some((game) => game.crew.length > 0);
}

/** Upcoming matchups exist but crews are not published yet. */
export function isPendingCrewSlate(assignments: AssignmentsFile): boolean {
  return !hasPublishedCrews(assignments) && scheduledMatchups(assignments).length > 0;
}

/** True when there are no official assignments or upcoming matchups to show. */
export function isOffseasonSlate(assignments: AssignmentsFile): boolean {
  return !hasPublishedCrews(assignments) && scheduledMatchups(assignments).length === 0;
}

export function upcomingMatchups(assignments: AssignmentsFile): AssignmentGame[] {
  return scheduledMatchups(assignments);
}

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

export function nhlPreviewBannerMessage(
  statsSource: RefStatsFile["meta"]["source"],
  assignmentsSource?: AssignmentsFile["source"],
  atsAvailable?: boolean,
): string {
  if (isNhlVerifiedData(statsSource) && atsAvailable) {
    return "Scores, PIM, and crews from NHL API game logs. ATS/O-U splits use synthetic closing lines derived from final scores. Descriptive only, not market odds.";
  }
  if (isNhlVerifiedData(statsSource)) {
    return "Scores, PIM, and ref×team W-L are from NHL API game logs.";
  }
  if (assignmentsSource === "nhl-api") {
    return "Today's slate crews are from NHL API. Historical ref×team stats are still building.";
  }
  return "Preview dataset with simulated schedules, crews, and lines. Do not treat ref×team or betting stats as verified.";
}

export function nhlAssignmentsAreVerified(
  assignments: Pick<AssignmentsFile, "source" | "games">,
): boolean {
  return assignments.source === "nhl-api" && assignments.games.length > 0;
}

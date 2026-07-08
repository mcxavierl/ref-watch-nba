import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

/** ESPN-backed game logs and ref stats — verified scores, penalties, crews. */
export function isNflVerifiedData(source: string | undefined): boolean {
  return source === "espn";
}

/** Simulated or legacy mislabeled preview data — not for accuracy claims. */
export function isNflSimulatedData(source: string | undefined): boolean {
  return source === "seeded" || source === "historical";
}

export function nflUsesSimulatedStats(meta: RefStatsFile["meta"]): boolean {
  return isNflSimulatedData(meta.source) || !meta.atsAvailable;
}

export function nflPreviewBannerMessage(
  statsSource: RefStatsFile["meta"]["source"],
  assignmentsSource?: AssignmentsFile["source"],
): string {
  if (isNflVerifiedData(statsSource) && assignmentsSource === "espn") {
    return "Scores, penalty counts, and tonight's crews are from ESPN. ATS/O-U splits are unavailable without verified closing lines.";
  }
  if (isNflVerifiedData(statsSource)) {
    return "Historical scores and penalty stats are from ESPN game data. Tonight's crew assignments may still be pending official release.";
  }
  return "Preview dataset — simulated schedules, crews, penalty splits, and lines. Do not treat ref×team or betting stats as verified against official records.";
}

export function nflAssignmentsAreVerified(
  assignments: Pick<AssignmentsFile, "source" | "games">,
): boolean {
  return assignments.source === "espn" && assignments.games.length > 0;
}

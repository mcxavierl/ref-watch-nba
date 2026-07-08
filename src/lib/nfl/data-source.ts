import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

/** ESPN-backed game logs and ref stats — verified scores, penalties, crews. */
export function isNflVerifiedData(source: string | undefined): boolean {
  return source === "espn" || source === "hybrid";
}

/** Simulated or legacy mislabeled preview data — not for accuracy claims. */
export function isNflSimulatedData(source: string | undefined): boolean {
  return source === "seeded" || source === "historical";
}

export function isNflHybridData(source: string | undefined): boolean {
  return source === "hybrid";
}

export function nflUsesSimulatedStats(meta: RefStatsFile["meta"]): boolean {
  return isNflSimulatedData(meta.source) || !meta.atsAvailable;
}

export function nflPreviewBannerMessage(
  statsSource: RefStatsFile["meta"]["source"],
  assignmentsSource?: AssignmentsFile["source"],
  atsAvailable?: boolean,
): string {
  if (isNflVerifiedData(statsSource) && atsAvailable) {
    return "Scores, penalty counts, ref×team W-L, and ATS/O-U splits use ESPN game data with nflverse closing lines.";
  }
  if (isNflVerifiedData(statsSource)) {
    return "Scores, penalty counts, and ref×team W-L are from ESPN game logs. ATS/O-U splits use nflverse lines when available.";
  }
  return "Preview dataset, simulated schedules, crews, penalty splits, and lines. Do not treat ref×team or betting stats as verified against official records.";
}

export function nflAssignmentsAreVerified(
  assignments: Pick<AssignmentsFile, "source" | "games">,
): boolean {
  return assignments.source === "espn" && assignments.games.length > 0;
}

import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

/** Verified match logs and ref stats from external feeds. */
export function isEplVerifiedData(source: string | undefined): boolean {
  return source === "espn";
}

/** Simulated or legacy preview data — not for accuracy claims. */
export function isEplSimulatedData(source: string | undefined): boolean {
  return source === "seeded" || source === "historical";
}

export function eplUsesSimulatedStats(meta: RefStatsFile["meta"]): boolean {
  return isEplSimulatedData(meta.source) || !meta.atsAvailable;
}

export function eplPreviewBannerMessage(
  statsSource: RefStatsFile["meta"]["source"],
  assignmentsSource?: AssignmentsFile["source"],
): string {
  if (isEplVerifiedData(statsSource) && assignmentsSource === "espn") {
    return "Scores, fouls, cards, and tonight's referee assignments are from verified match data. ATS/O-U splits are unavailable without verified closing lines.";
  }
  if (isEplVerifiedData(statsSource)) {
    return "Historical goals, fouls, and card stats are from verified match data. Tonight's referee assignments may still be pending official release.";
  }
  return "Premier League preview dataset, offseason seed data only. Do not treat ref×team or betting stats as verified against official records.";
}

export function eplAssignmentsAreVerified(
  assignments: Pick<AssignmentsFile, "source" | "games">,
): boolean {
  return assignments.source === "espn" && assignments.games.length > 0;
}

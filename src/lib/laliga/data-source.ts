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

export function laligaPreviewBannerMessage(
  statsSource: RefStatsFile["meta"]["source"],
  assignmentsSource?: AssignmentsFile["source"],
): string {
  if (isLaligaVerifiedData(statsSource) && assignmentsSource === "espn") {
    return "Scores, fouls, cards, and tonight's referee assignments are from verified ESPN match data. ATS/O-U splits are unavailable without verified closing lines.";
  }
  if (isLaligaVerifiedData(statsSource)) {
    return "Historical goals, fouls, and card stats are from verified ESPN match data (2021–22 onward). Tonight's referee assignments may still be pending official release.";
  }
  return "La Liga preview dataset only. Do not treat ref×team or betting stats as verified against official records.";
}

export function laligaAssignmentsAreVerified(
  assignments: Pick<AssignmentsFile, "source" | "games">,
): boolean {
  return assignments.source === "espn" && assignments.games.length > 0;
}

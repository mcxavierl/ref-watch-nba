import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

export function isCbbVerifiedData(source: string | undefined): boolean {
  return source === "espn";
}

export function isCbbSimulatedData(source: string | undefined): boolean {
  return source === "seeded" || source === "historical";
}

export function cbbPreviewBannerMessage(
  statsSource: RefStatsFile["meta"]["source"],
  assignmentsSource?: AssignmentsFile["source"],
): string {
  if (isCbbVerifiedData(statsSource) && assignmentsSource === "espn") {
    return "Scores, foul counts, and tonight's crews are from ESPN. ATS/O-U splits are unavailable without verified closing lines.";
  }
  if (isCbbVerifiedData(statsSource)) {
    return "Historical scores and foul stats are from ESPN game data. Tonight's crew assignments may still be pending official release.";
  }
  return "NCAA men's basketball preview dataset, offseason seed data only. Crews and tendencies populate when the season opens and game data backfills.";
}

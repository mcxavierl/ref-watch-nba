import type { AssignmentsFile, RefStatsFile } from "@/lib/types";

/** ESPN-backed game logs and ref stats — verified scores, penalties, crews. */
export function isCfbVerifiedData(source: string | undefined): boolean {
  return source === "espn";
}

/** Simulated or legacy mislabeled preview data — not for accuracy claims. */
export function isCfbSimulatedData(source: string | undefined): boolean {
  return source === "seeded" || source === "historical";
}

/** ESPN game logs shipped; ref crews blocked until a non-ESPN officials source lands. */
export function isCfbOfficialsPending(
  stats: Pick<RefStatsFile, "meta" | "refs"> | null | undefined,
): boolean {
  if (!stats?.meta) return false;
  return (
    isCfbVerifiedData(stats.meta.source) &&
    (stats.refs?.length ?? 0) === 0 &&
    (stats.meta.totalGamesProcessed ?? 0) > 0
  );
}

export function cfbUsesSimulatedStats(meta: RefStatsFile["meta"]): boolean {
  return isCfbSimulatedData(meta.source) || !meta.atsAvailable;
}

export function cfbPreviewBannerMessage(
  statsSource: RefStatsFile["meta"]["source"],
  assignmentsSource?: AssignmentsFile["source"],
): string {
  if (isCfbVerifiedData(statsSource) && assignmentsSource === "espn") {
    return "Scores, penalty counts, and tonight's crews are from ESPN. ATS/O-U splits are unavailable without verified closing lines.";
  }
  if (isCfbVerifiedData(statsSource)) {
    return "Historical scores and penalty stats are from ESPN game data. Tonight's crew assignments may still be pending official release.";
  }
  return "NCAA football preview dataset, offseason seed data only. Do not treat ref×team or betting stats as verified against official records.";
}

export function cfbAssignmentsAreVerified(
  assignments: Pick<AssignmentsFile, "source" | "games">,
): boolean {
  return assignments.source === "espn" && assignments.games.length > 0;
}

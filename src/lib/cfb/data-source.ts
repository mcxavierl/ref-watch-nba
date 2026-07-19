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

export function cfbOfficialsPendingMessage(meta: RefStatsFile["meta"]): string {
  const games = meta.totalGamesProcessed ?? 0;
  return `ESPN provides ${games.toLocaleString("en-US")} scored games with penalty data, but official crews are not published in ESPN summaries. Ref profiles and ref×team matrix stay unavailable until a secondary officials source is linked.`;
}

export function cfbAssignmentsAreVerified(
  assignments: Pick<AssignmentsFile, "source" | "games">,
): boolean {
  return assignments.source === "espn" && assignments.games.length > 0;
}

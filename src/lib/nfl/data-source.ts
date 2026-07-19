import type { RefStatsFile } from "@/lib/types";

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

export function nflVerifiedDatasetNote(
  gameCount?: number,
  qualifiedPairs?: number,
  teamStatsPairs?: number,
): string {
  const games = gameCount ?? 2757;
  if (qualifiedPairs !== undefined && teamStatsPairs !== undefined) {
    return `Ref×team W-L rebuilt from ${games} ESPN game logs (2016-2026). ${qualifiedPairs}/${teamStatsPairs} ref×team pairs meet the 3+ game matrix gate. Ties are excluded from straight-up W-L.`;
  }
  return "Scores, penalty counts, and ref×team W-L from ESPN game logs (2016-2026). ATS/O-U from nflverse closing lines where matched.";
}

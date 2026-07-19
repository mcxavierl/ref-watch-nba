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
  return "Preview dataset with placeholder schedules, crews, penalty splits, and lines. Do not treat ref×team or betting stats as verified against official records.";
}

export function nflBettingHonestyCopy(meta: RefStatsFile["meta"]): string {
  if (isNflSimulatedData(meta.source)) {
    return "NFL preview dataset. Schedules, crews, penalty splits, and betting stats are not verified against official records.";
  }
  if (!meta.atsAvailable) {
    return "NFL scores and ref×team W-L are from ESPN game logs. ATS/O-U splits are not shown because verified closing lines are unavailable for this sample.";
  }
  return "ATS/O-U uses nflverse historical closing lines on matched games only, not live sportsbook prices. Treat as exploratory historical context, not picks.";
}

export function nflVerifiedDatasetNote(
  gameCount?: number,
  qualifiedPairs?: number,
  teamStatsPairs?: number,
): string {
  const games = gameCount ?? 6825;
  if (qualifiedPairs !== undefined && teamStatsPairs !== undefined) {
    return `Ref×team W-L rebuilt from ${games} ESPN game logs. ${qualifiedPairs}/${teamStatsPairs} ref×team pairs meet the 3+ game matrix gate. Ties are excluded from straight-up W-L.`;
  }
  return "Scores, penalty counts, and ref×team W-L from ESPN game logs (2000-present). ATS/O-U from nflverse closing lines where matched.";
}

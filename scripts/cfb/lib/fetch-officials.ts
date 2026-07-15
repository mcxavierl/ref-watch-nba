import type { CfbGameSummary } from "./espn";

export type FetchedOfficial = {
  name: string;
  number?: number;
  role?: string;
};

export type FetchOfficialsResult = {
  officials: FetchedOfficial[];
  source: "espn" | "none";
};

/** ESPN college-football summaries rarely include gameInfo.officials — probe and return when present. */
export function fetchOfficialsFromSummary(
  summary: CfbGameSummary,
): FetchOfficialsResult {
  if (summary.officials.length === 0) {
    return { officials: [], source: "none" };
  }

  return {
    source: "espn",
    officials: summary.officials.map((official) => ({
      name: official.fullName,
      role: official.positionName ?? "referee",
    })),
  };
}

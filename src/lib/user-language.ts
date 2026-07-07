import type { SampleQuality } from "@/lib/types";

export type ConfidenceTier = "Strong" | "Moderate" | "Thin";

export type Sport = "nba" | "nhl";

const SPORT_COPY = {
  nba: {
    scoringUnit: "pts",
    whistleUnit: "fouls",
    pointsAboveAverage: "Points above average",
    scoringLabel: "Scoring",
    whistleLabel: "Whistle",
    overLeanLabel: "Historical over lean",
    lineComparisonLabel: "Total vs benchmark",
    homeBiasLabel: "Home/road pattern",
  },
  nhl: {
    scoringUnit: "goals",
    whistleUnit: "PIM",
    pointsAboveAverage: "Goals above average",
    scoringLabel: "Goals",
    whistleLabel: "Penalties",
    overLeanLabel: "Historical over lean",
    lineComparisonLabel: "Total vs benchmark",
    homeBiasLabel: "Home/road pattern",
  },
} as const;

export function sportCopy(sport: Sport) {
  return SPORT_COPY[sport];
}

/** Map internal sample quality to user-facing confidence tiers. */
export function confidenceTier(
  quality?: SampleQuality,
  sampleGames?: number,
  gateCleared?: boolean,
): ConfidenceTier {
  if (quality === "strong") return "Strong";
  if (quality === "moderate") return "Moderate";
  if (quality === "weak" || gateCleared === false) return "Thin";
  if (sampleGames !== undefined && sampleGames >= 40) return "Moderate";
  if (sampleGames !== undefined && sampleGames >= 25) return "Moderate";
  return "Thin";
}

export function confidenceTierClass(tier: ConfidenceTier): string {
  switch (tier) {
    case "Strong":
      return "text-zinc-700 bg-zinc-100 ring-zinc-200";
    case "Moderate":
      return "text-zinc-600 bg-zinc-50 ring-zinc-200";
    case "Thin":
      return "text-zinc-500 bg-zinc-50 ring-zinc-100";
  }
}

export function formatSampleCount(games: number): string {
  return `${games.toLocaleString()} game${games === 1 ? "" : "s"}`;
}

export function seededDataNote(): string {
  return "Historical line data unavailable for some games; see Methodology for details.";
}

/** Strip developer-only npm hints from data meta notes before showing users. */
export function userFacingDataNote(note: string | undefined): string | undefined {
  if (!note) return undefined;
  if (/npm run/i.test(note)) {
    return "Historical stats are still loading for some teams; check back after the next data refresh.";
  }
  return note;
}

export function ouLeanDisplay(lean: "over" | "under" | "neutral"): string {
  if (lean === "over") return "OVER";
  if (lean === "under") return "UNDER";
  return "NEUTRAL";
}

export function benchmarkLabel(
  source: "sportsbook" | "league_proxy",
  value: number | string,
): string {
  return source === "sportsbook" ? "book total" : `${value} benchmark`;
}

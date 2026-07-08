import type { SampleQuality } from "@/lib/types";

export type ConfidenceTier = "Strong" | "Moderate" | "Thin";

export type Sport = "nba" | "nhl" | "nfl";

const SPORT_COPY = {
  nba: {
    scoringUnit: "pts",
    whistleUnit: "fouls",
    pointsAboveAverage: "Points above average",
    scoringLabel: "Scoring",
    whistleLabel: "Whistle",
    overLeanLabel: "Historical over-rate tendency",
    lineComparisonLabel: "Total vs benchmark",
    homeBiasLabel: "Home/road pattern",
  },
  nhl: {
    scoringUnit: "goals",
    whistleUnit: "PIM",
    pointsAboveAverage: "Goals above average",
    scoringLabel: "Goals",
    whistleLabel: "Penalties",
    overLeanLabel: "Historical over-rate tendency",
    lineComparisonLabel: "Total vs benchmark",
    homeBiasLabel: "Home/road pattern",
  },
  nfl: {
    scoringUnit: "pts",
    whistleUnit: "flags",
    pointsAboveAverage: "Points above average",
    scoringLabel: "Scoring",
    whistleLabel: "Flags",
    overLeanLabel: "Historical over-rate tendency",
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
      return "confidence-tier-badge confidence-tier-strong";
    case "Moderate":
      return "confidence-tier-badge confidence-tier-moderate";
    case "Thin":
      return "confidence-tier-badge confidence-tier-thin";
  }
}

export function formatSampleCount(games: number): string {
  return `${games.toLocaleString()} game${games === 1 ? "" : "s"}`;
}

export function seededDataNote(): string {
  return "Historical line data unavailable for some games; see Methodology for details.";
}

/** Visible when ref×team W-L is from BBR but other splits are simulated/estimated. */
export function usesBbrRefTeamRecords(
  meta: { refTeamWinLossSource?: string },
): boolean {
  return meta.refTeamWinLossSource === "basketball-reference";
}

export function refTeamDataNote(
  meta: {
    source?: string;
    refTeamWinLossSource?: string;
  },
): string | null {
  if (!usesBbrRefTeamRecords(meta)) return null;
  if (meta.source === "nba-stats-api") {
    return "Ref×team win-loss is from Basketball-Reference; foul, scoring, and ATS splits use NBA Stats API data.";
  }
  return "Ref×team win-loss is from Basketball-Reference; foul, scoring, and ATS/O-U splits may use simulated or estimated data.";
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

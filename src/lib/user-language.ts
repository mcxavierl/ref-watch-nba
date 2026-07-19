import type { SampleQuality } from "@/lib/types";

export type ConfidenceTier = "Strong" | "Moderate" | "Thin";

export type Sport = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

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
  cbb: {
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
  epl: {
    scoringUnit: "goals",
    whistleUnit: "fouls",
    pointsAboveAverage: "Goals above average",
    scoringLabel: "Goals",
    whistleLabel: "Fouls",
    overLeanLabel: "Historical over-rate tendency",
    lineComparisonLabel: "Total vs benchmark",
    homeBiasLabel: "Home/road pattern",
  },
  laliga: {
    scoringUnit: "goals",
    whistleUnit: "fouls",
    pointsAboveAverage: "Goals above average",
    scoringLabel: "Goals",
    whistleLabel: "Fouls",
    overLeanLabel: "Historical over-rate tendency",
    lineComparisonLabel: "Total vs benchmark",
    homeBiasLabel: "Home/road pattern",
  },
  cfb: {
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

/** Ref×team W-L sourced from Basketball-Reference game logs. */
export function usesBbrRefTeamRecords(
  meta: { refTeamWinLossSource?: string },
): boolean {
  return meta.refTeamWinLossSource === "basketball-reference";
}

function isVerifiedNbaGameLogIngest(meta: {
  source?: string;
  data_verified?: boolean;
}): boolean {
  return (
    meta.data_verified === true &&
    (meta.source === "hybrid" ||
      meta.source === "nba-stats-api" ||
      meta.source === "historical")
  );
}

/** Amber banner on ref/matrix pages when a data caveat is needed. */
export function refTeamDataNote(
  meta: {
    source?: string;
    refTeamWinLossSource?: string;
    data_verified?: boolean;
    atsAvailable?: boolean;
  },
): string | null {
  if (!usesBbrRefTeamRecords(meta)) return null;

  if (isVerifiedNbaGameLogIngest(meta)) {
    return null;
  }

  if (meta.source === "nba-stats-api") {
    const parts = [
      "Ref×team win-loss is from Basketball-Reference",
      "foul and scoring from NBA Stats API game logs",
    ];
    if (meta.atsAvailable) {
      parts.push("ATS/O-U from sportsbook closing lines where available");
    }
    return `${parts.join("; ")}.`;
  }

  return null;
}

/** Strip developer-only paths and CLI hints from user-visible copy. */
export function sanitizeUserFacingCopy(text: string): string {
  return text
    .replace(/\s+in data\/[\w./-]+\.json/gi, "")
    .replace(/\b(?:data|public|src)\/[\w./-]+\.json\b/gi, "historical game logs")
    .replace(/\bnpm run [\w:-]+/gi, "the next data refresh")
    .replace(/\bRe-run\s+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Strip developer-only npm hints from data meta notes before showing users. */
export function userFacingDataNote(note: string | undefined): string | undefined {
  if (!note) return undefined;
  if (/npm run/i.test(note)) {
    return "Historical stats are still loading for some teams; check back after the next data refresh.";
  }
  const deduped = dedupeNoteSentences(sanitizeUserFacingCopy(note));
  return deduped.length > 0 ? deduped : undefined;
}

function dedupeNoteSentences(note: string): string {
  const sentences = note
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return [...new Set(sentences)].join(" ");
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

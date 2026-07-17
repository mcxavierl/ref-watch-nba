/** User-facing label for the renamed homepage clutch metric (formerly GSNI). */
export const CLUTCH_CONSISTENCY_INDEX_LABEL = "Clutch Consistency Index";

export const CLUTCH_CONSISTENCY_TOOLTIP =
  "Measures how much an official's penalty frequency deviates in high-leverage situations (<5 mins, <5 pt differential) compared to their career baseline.";

/** High-leverage minute floor before we drop the preliminary tag. */
export const CLUTCH_CONSISTENCY_PRELIMINARY_MINUTES = 50;

export const CLUTCH_CONSISTENCY_SCALE = {
  variance: "High behavioral variance",
  neutral: "League-average profile",
  consistency: "High consistency",
} as const;

export type ConsistencyProfile = "high-consistency" | "high-variance" | "moderate";

export function consistencyProfileFromIndex(index: number): ConsistencyProfile {
  if (index >= 75) return "high-consistency";
  if (index <= 25) return "high-variance";
  return "moderate";
}

export function consistencyLabel(profile: ConsistencyProfile): string {
  if (profile === "high-consistency") return "high consistency";
  if (profile === "high-variance") return "high behavioral variance";
  return "moderate consistency";
}

/** Headline copy: "[Official Name] shows [label] in clutch situations." */
export function clutchSituationHeadline(refName: string, index: number): string {
  return `${refName} shows ${consistencyLabel(consistencyProfileFromIndex(index))} in clutch situations.`;
}

export function clutchSituationSummary(index: number): string {
  const profile = consistencyProfileFromIndex(index);
  if (profile === "high-consistency") {
    return "Whistle frequency in clutch minutes stays close to this official's career baseline.";
  }
  if (profile === "high-variance") {
    return "Whistle frequency in clutch minutes diverges most from this official's career baseline.";
  }
  return "Whistle frequency in clutch minutes tracks near league-average deviation.";
}

export function highLeverageMinutesLine(minutes: number): string {
  return `Based on N=${Math.round(minutes)} high-leverage minutes.`;
}

export function confidenceTagForMinutes(minutes: number): string | null {
  if (minutes < CLUTCH_CONSISTENCY_PRELIMINARY_MINUTES) return "Preliminary";
  return null;
}

export function formatConsistencyIndex(index: number): string {
  return String(Math.round(index));
}

/**
 * Match whistle/foul intensity labels relative to league baseline.
 */

/** Absolute foul floor for high-intensity games (both teams combined). */
export const HIGH_INTENSITY_FOUL_FLOOR = 30;

/** Fouls above/below league average before intensity shifts from Standard. */
export const INTENSITY_LEAGUE_DELTA_THRESHOLD = 4;

export type MatchIntensityLabel = "High Intensity" | "Standard" | "Low Intensity";

export type MatchIntensitySlug = "high" | "standard" | "low";

export function intensityLabelSlug(label: MatchIntensityLabel): MatchIntensitySlug {
  switch (label) {
    case "High Intensity":
      return "high";
    case "Low Intensity":
      return "low";
    default:
      return "standard";
  }
}

/**
 * Classify match foul volume vs league average.
 * High: above league avg + threshold OR above 30 total fouls.
 * Low: below league avg - threshold.
 * Standard: otherwise.
 */
export function getIntensityLabel(
  foulCount: number,
  leagueAvgFouls?: number,
): MatchIntensityLabel {
  if (!Number.isFinite(foulCount) || foulCount < 0) return "Standard";

  if (foulCount > HIGH_INTENSITY_FOUL_FLOOR) return "High Intensity";

  if (
    leagueAvgFouls !== undefined &&
    Number.isFinite(leagueAvgFouls) &&
    leagueAvgFouls > 0
  ) {
    const threshold = INTENSITY_LEAGUE_DELTA_THRESHOLD;
    if (foulCount > leagueAvgFouls + threshold) return "High Intensity";
    if (foulCount < leagueAvgFouls - threshold) return "Low Intensity";
    return "Standard";
  }

  return "Standard";
}

export const FOULS_COLUMN_TOOLTIP =
  "Foul count relative to league baseline. High-intensity matches may be skewed by team playstyle or referee officiating tendencies.";

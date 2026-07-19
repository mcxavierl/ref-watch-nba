import { formatSigned } from "@/lib/stats-utils";

export type AtsInsightLabel = "Strong ATS Fade" | "ATS Cover Lean" | "Neutral ATS";

/** Behavioral ATS label from deviation from a 50% split. */
export function atsInsightLabel(coverRate: number): AtsInsightLabel {
  if (coverRate <= 0.46) return "Strong ATS Fade";
  if (coverRate >= 0.54) return "ATS Cover Lean";
  return "Neutral ATS";
}

export function atsOutlierHeadline(
  refName: string,
  coverRate: number,
  rateLabel: string,
): string {
  const insight = atsInsightLabel(coverRate);
  if (insight === "Neutral ATS") {
    return `${refName}: ${rateLabel} ATS split`;
  }
  return `${refName}: ${insight} (${rateLabel})`;
}

export function homeAtsSignalHeadline(edge: number): string {
  if (edge >= 0.05) return "ATS Cover Lean";
  if (edge <= -0.05) return "Strong ATS Fade";
  return "Neutral home ATS";
}

export function scoringPaceInsight(delta: number): string {
  if (delta >= 1.5) return "Pace Inflation";
  if (delta <= -1.5) return "Scoring Suppression";
  if (delta >= 0.35) return "Elevated Scoring";
  if (delta <= -0.35) return "Lower Scoring";
  return "Typical Scoring";
}

export function whistleInflationHeadline(delta: number, whistleLabel: string): string {
  if (delta >= 2) return "Whistle Inflation";
  if (delta <= -2) return "Quiet Whistle";
  if (delta > 0) return `Heavier ${whistleLabel}`;
  if (delta < 0) return `Lighter ${whistleLabel}`;
  return `Typical ${whistleLabel}`;
}

export function homeBiasHeadline(gap: number): string {
  if (gap >= 3) return "High Home Bias";
  if (gap <= -3) return "Road Scoring Lean";
  return "Balanced Home/Road";
}

export function overTiltInsight(tilt: number): string {
  if (tilt >= 0.06) return "Over Lean";
  if (tilt <= -0.06) return "Under Lean";
  return "Neutral O/U";
}

export function rankingInsightHeadline(
  ref: { totalPointsDelta: number; foulsDelta: number; overRate: number },
  leagueId: string,
  whistleDeltaValue?: number,
): string {
  const whistle = whistleDeltaValue ?? ref.foulsDelta;
  const scoringInsight = scoringPaceInsight(ref.totalPointsDelta);
  const whistleInsight = whistleInflationHeadline(
    whistle,
    leagueId === "nfl" ? "flags" : leagueId === "nhl" ? "minors" : "fouls",
  );
  if (Math.abs(ref.totalPointsDelta) >= Math.abs(whistle)) {
    return `${scoringInsight} · ${formatSigned(ref.totalPointsDelta)} vs avg`;
  }
  return `${whistleInsight} · ${formatSigned(whistle)} vs avg`;
}

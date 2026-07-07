import { computeOuLean } from "@/lib/stats-utils";
import type { OuLean, WhistleBias } from "@/lib/types";

export type OuLeanStatTarget = "overRate" | "avgTotal";

function pickOuLeanTarget(
  lean: Exclude<OuLean, "neutral">,
  overRate: number,
  delta: number,
): OuLeanStatTarget {
  const overRateTriggered =
    lean === "over" ? overRate >= 0.56 : overRate <= 0.44;
  const totalTriggered = lean === "over" ? delta >= 3 : delta <= -3;

  if (overRateTriggered && !totalTriggered) return "overRate";
  if (totalTriggered && !overRateTriggered) return "avgTotal";

  const overRateExceed =
    lean === "over" ? overRate - 0.56 : 0.44 - overRate;
  const totalExceed = lean === "over" ? delta - 3 : -3 - delta;

  return overRateExceed / 0.06 >= totalExceed / 3 ? "overRate" : "avgTotal";
}

export function getOuLeanAnnotation(
  overRate: number,
  avgTotal: number,
  leagueAvgTotal: number,
): { target: OuLeanStatTarget; label: string } | null {
  const lean = computeOuLean(overRate, avgTotal, leagueAvgTotal);
  if (lean === "neutral") return null;

  const label =
    lean === "over"
      ? "Tends toward high-scoring games"
      : "Tends toward low-scoring games";
  const delta = avgTotal - leagueAvgTotal;

  return {
    target: pickOuLeanTarget(lean, overRate, delta),
    label,
  };
}

export function getOuLeanAnnotationFromDelta(
  overRate: number,
  totalPointsDelta: number,
): { target: OuLeanStatTarget; label: string } | null {
  const lean: OuLean =
    overRate >= 0.56 || totalPointsDelta >= 3
      ? "over"
      : overRate <= 0.44 || totalPointsDelta <= -3
        ? "under"
        : "neutral";
  if (lean === "neutral") return null;

  const label =
    lean === "over"
      ? "Tends toward high-scoring games"
      : "Tends toward low-scoring games";

  return {
    target: pickOuLeanTarget(lean, overRate, totalPointsDelta),
    label,
  };
}

export function getWhistleAnnotation(
  bias: WhistleBias,
  teamAbbr: string,
): string {
  if (bias === "team") return `More fouls on ${teamAbbr}`;
  if (bias === "opponent") return "More fouls on opponents";
  return "Roughly even fouls";
}

import { winRateDeltaPoints } from "@/lib/teamRecord";

export function deltaTone(
  value: number,
  threshold = 0,
): "positive" | "negative" | "neutral" {
  if (value > threshold) return "positive";
  if (value < -threshold) return "negative";
  return "neutral";
}

export function winRateTone(
  rate: number,
  baseline: number,
): "positive" | "negative" | "neutral" {
  return deltaTone(winRateDeltaPoints(rate, baseline), 2);
}

export function foulEdgeTone(value: number): "positive" | "negative" | "neutral" {
  return deltaTone(value, 1);
}

export function scoringDeltaTone(delta: number): "positive" | "negative" | "neutral" {
  return deltaTone(delta, 2);
}

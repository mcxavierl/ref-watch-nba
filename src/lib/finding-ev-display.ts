/** Client-safe EV display helpers (no Node fs imports). */

export const DEFAULT_STANDARD_JUICE = -110;

export const EDGE_POSITIVE_THRESHOLD = 2;

export const EDGE_NEGATIVE_THRESHOLD = -2;

export const EV_DISCLAIMER =
  "Expected Value is a statistical estimate, not a guaranteed return. Use this to identify market discrepancies, not as a source of truth.";

export type EvMarketSide = "over" | "under" | "cover";

export type FindingEvSnapshot = {
  findingId: string;
  impliedProbability: number;
  adjustedProbability: number;
  edgeScore: number;
  lwisAdjustment: number;
  marketOdds: number;
  marketLabel: string;
  marketSide: EvMarketSide;
};

export function pickStrongestEvSnapshot(
  snapshots: Array<FindingEvSnapshot | null | undefined>,
): FindingEvSnapshot | null {
  let best: FindingEvSnapshot | null = null;
  for (const snapshot of snapshots) {
    if (!snapshot) continue;
    if (!best || Math.abs(snapshot.edgeScore) > Math.abs(best.edgeScore)) {
      best = snapshot;
    }
  }
  return best;
}

export function edgeTone(
  edgeScore: number,
): "positive" | "negative" | "neutral" {
  if (edgeScore > EDGE_POSITIVE_THRESHOLD) return "positive";
  if (edgeScore < EDGE_NEGATIVE_THRESHOLD) return "negative";
  return "neutral";
}

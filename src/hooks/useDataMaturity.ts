import {
  adjustedDeltaTooltipText,
  dataMaturityPercent,
  displayWinRateDelta,
  type WinRateDeltaDisplay,
} from "@/lib/data-maturity";

export type DataMaturityView = {
  sampleSize: number;
  percent: number;
  delta: WinRateDeltaDisplay | null;
  adjustedTooltip: string | null;
  showFootnote: boolean;
};

export function useDataMaturity(
  sampleSize: number,
  rawDeltaPp?: number,
): DataMaturityView {
  const percent = dataMaturityPercent(sampleSize);
  const delta =
    rawDeltaPp !== undefined && Number.isFinite(rawDeltaPp) && sampleSize > 0
      ? displayWinRateDelta(rawDeltaPp, sampleSize)
      : null;

  return {
    sampleSize,
    percent,
    delta,
    adjustedTooltip:
      delta?.isAdjusted === true
        ? adjustedDeltaTooltipText(delta.displayDelta)
        : null,
    showFootnote: delta?.isAdjusted === true,
  };
}

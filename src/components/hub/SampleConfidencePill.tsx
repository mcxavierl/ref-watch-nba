import {
  matrixSampleConfidenceLabel,
  matrixSampleConfidenceTier,
  type MatrixSampleConfidenceTier,
} from "@/lib/data-maturity";

const TIER_CLASS: Record<MatrixSampleConfidenceTier, string> = {
  high: "sample-confidence-pill sample-confidence-pill--high bg-emerald-500/10 text-emerald-400",
  moderate: "sample-confidence-pill sample-confidence-pill--moderate bg-amber-500/10 text-amber-400",
  low: "sample-confidence-pill sample-confidence-pill--low bg-rose-500/10 text-rose-400",
};

/**
 * CLINICAL MODERN STANDARD: Color-coded sample-size pill for matrix split cards.
 * Users should judge trustworthiness from the pill before reading the delta.
 */
export function SampleConfidencePill({
  games,
  className = "",
}: {
  games: number;
  className?: string;
}) {
  const tier = matrixSampleConfidenceTier(games);
  const label = matrixSampleConfidenceLabel(tier);

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-4 py-1.5 text-xs font-semibold tabular-nums ${TIER_CLASS[tier]} ${className}`.trim()}
      aria-label={`Sample size: ${label}`}
    >
      {label}
    </span>
  );
}

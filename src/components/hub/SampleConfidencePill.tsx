import {
  formatSampleSizeLabel,
  matrixSampleConfidenceTier,
  type MatrixSampleConfidenceTier,
} from "@/lib/data-maturity";

const TIER_CLASS: Record<MatrixSampleConfidenceTier, string> = {
  high: "sample-confidence-pill sample-confidence-pill--high border-slate-700/80 bg-slate-900/70",
  moderate: "sample-confidence-pill sample-confidence-pill--moderate border-slate-700/80 bg-slate-900/70",
  low: "sample-confidence-pill sample-confidence-pill--low border-slate-700/80 bg-slate-900/70",
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
  const label = formatSampleSizeLabel(games);

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-4 py-1.5 text-xs font-semibold tabular-nums text-white ${TIER_CLASS[tier]} ${className}`.trim()}
      aria-label={`Sample size: ${label} (${tier} confidence tier)`}
    >
      {label}
    </span>
  );
}

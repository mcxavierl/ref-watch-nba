import { Sparkles } from "lucide-react";
import { gsniCorrelationLabel } from "@/lib/gsni-display";

type GsniCorrelationPillProps = {
  score: number;
  className?: string;
  /** When true, render a slate Neutral pill instead of hiding it. */
  showNeutral?: boolean;
};

/** High-correlation insight pill for diagnostic GSNI cards. */
export function GsniCorrelationPill({
  score,
  className = "",
  showNeutral = false,
}: GsniCorrelationPillProps) {
  const label = gsniCorrelationLabel(score);

  if (label === "Neutral" && !showNeutral) {
    return null;
  }

  const toneClass =
    label === "Elevated"
      ? "gsni-correlation-pill gsni-correlation-pill--elevated"
      : label === "Suppressed"
        ? "gsni-correlation-pill gsni-correlation-pill--suppressed"
        : "gsni-correlation-pill gsni-correlation-pill--neutral";

  return (
    <span
      className={`pill-constrain inline-flex min-w-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium leading-none ${toneClass} ${className}`.trim()}
    >
      <Sparkles className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2.1} aria-hidden />
      <span className="pill-constrain-text">{label}</span>
    </span>
  );
}

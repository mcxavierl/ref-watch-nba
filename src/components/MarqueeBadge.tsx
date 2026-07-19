import { Sparkles } from "lucide-react";

/** Indigo marquee pill for high-leverage upcoming games (LeverageIndex > 75). */
export function MarqueeBadge({
  breakdown,
  className = "",
}: {
  breakdown?: string;
  className?: string;
}) {
  return (
    <span
      className={`marquee-badge pill-constrain inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-900/30 px-2.5 py-1 text-[11px] font-medium leading-none text-indigo-400 ${className}`.trim()}
      title={breakdown}
    >
      <Sparkles className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2.1} aria-hidden />
      <span className="pill-constrain-text">Marquee</span>
    </span>
  );
}

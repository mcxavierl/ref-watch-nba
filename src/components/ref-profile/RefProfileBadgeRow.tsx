import type { ReactNode } from "react";

type RefProfileBadgeRowProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

/** Horizontal flex-wrap row for archetype, crew role, league, and status pills. */
export function RefProfileBadgeRow({
  children,
  className = "",
  "aria-label": ariaLabel,
}: RefProfileBadgeRowProps) {
  return (
    <div
      className={`ref-profile-badge-row flex flex-wrap items-center gap-2 ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

export function RefProfileBadgePill({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "negative" | "caution";
  className?: string;
}) {
  return (
    <span
      className={`ref-profile-badge-pill text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${tone === "positive" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : tone === "negative" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : tone === "caution" ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" : "bg-slate-800/50 text-slate-300 border border-slate-700/50"} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Insights-page capsule pill for GSNI context metadata. */
export function GsniInsightPill({
  icon: Icon,
  children,
  className = "",
}: {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`gsni-insight-pill inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 tabular-nums ${className}`.trim()}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2.1} aria-hidden />
      <span>{children}</span>
    </span>
  );
}

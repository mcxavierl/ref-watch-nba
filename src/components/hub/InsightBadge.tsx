import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Unified insight/notable pill: Sparkles by default, truncates inside flex rows.
 */
export function InsightBadge({
  label,
  icon: Icon = Sparkles,
  className = "",
}: {
  label: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={`insight-badge inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium leading-none text-slate-300 ${className}`.trim()}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2.1} aria-hidden />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

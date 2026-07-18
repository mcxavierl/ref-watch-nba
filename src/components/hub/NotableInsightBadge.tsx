import { Sparkles } from "lucide-react";

/**
 * CLINICAL MODERN STANDARD: insight discovery badge for statistically notable
 * profile signals. Uses indigo/sky tones to read as data insight, not a warning.
 */
export function NotableInsightBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`notable-insight-badge inline-flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-200/50 bg-indigo-50/70 px-2.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-400 ${className}`.trim()}
    >
      <Sparkles className="notable-insight-badge-icon h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="notable-insight-badge-label">Notable</span>
    </span>
  );
}

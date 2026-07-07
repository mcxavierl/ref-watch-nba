import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function MetricBlock({
  icon: Icon,
  iconClassName = "text-zinc-500",
  label,
  value,
  hint,
  badge,
  badgeTone = "neutral",
}: {
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  value: string;
  hint?: string;
  badge?: string;
  badgeTone?: "positive" | "negative" | "neutral" | "warning";
}) {
  const badgeColors = {
    positive: "bg-emerald-100 text-emerald-800",
    negative: "bg-rose-100 text-rose-800",
    neutral: "bg-zinc-100 text-zinc-700",
    warning: "bg-amber-100 text-amber-900",
  };

  return (
    <div className="flex flex-col gap-2 bg-white px-4 py-4 sm:px-5">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 shrink-0 ${iconClassName}`} aria-hidden />
        <span className="text-sm font-medium text-zinc-600">{label}</span>
      </div>
      <p className="font-mono text-xl font-semibold tabular-nums leading-tight text-zinc-900">
        {value}
      </p>
      {hint && <p className="text-sm leading-snug text-zinc-600">{hint}</p>}
      {badge && (
        <span
          className={`inline-flex w-fit rounded-md px-2 py-0.5 text-sm font-medium ${badgeColors[badgeTone]}`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {children}
    </div>
  );
}

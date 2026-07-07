import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { MetricProvenance } from "@/lib/types";
import { ProvenanceMarker, provenanceValueClass } from "@/components/ProvenanceMarker";
import { isFallbackMetric } from "@/lib/provenance-utils";

export function MetricBlock({
  icon: Icon,
  iconClassName = "text-zinc-500",
  label,
  value,
  hint,
  badge,
  badgeTone = "neutral",
  provenance,
}: {
  icon?: LucideIcon;
  iconClassName?: string;
  label: ReactNode;
  value: string;
  hint?: ReactNode;
  badge?: ReactNode;
  badgeTone?: "positive" | "negative" | "neutral" | "warning";
  provenance?: MetricProvenance;
}) {
  const hidden = isFallbackMetric(provenance);
  const badgeColors = {
    positive: "bg-zinc-100 text-zinc-700",
    negative: "bg-zinc-100 text-zinc-700",
    neutral: "bg-zinc-100 text-zinc-700",
    warning: "bg-amber-50 text-amber-900",
  };

  return (
    <div className="flex flex-col gap-2 bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {Icon && (
          <Icon
            className={`size-3.5 shrink-0 ${iconClassName}`}
            strokeWidth={2.25}
            aria-hidden
          />
        )}
        <span className="min-w-0 text-sm font-medium text-zinc-600">{label}</span>
        {!hidden && <ProvenanceMarker provenance={provenance} compact />}
      </div>
      <p
        className={`font-mono text-xl font-semibold tabular-nums leading-tight ${provenanceValueClass(provenance) ?? "text-zinc-900"}`}
      >
        {hidden ? "-" : value}
      </p>
      {hint && !hidden && <p className="text-sm leading-snug text-zinc-600">{hint}</p>}
      {badge && (
        <span
          className={`metric-block-badge inline-flex w-fit max-w-full rounded-md px-2 py-0.5 text-sm font-medium ${badgeColors[badgeTone]}`}
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

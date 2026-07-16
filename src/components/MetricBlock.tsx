import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { MetricProvenance } from "@/lib/types";
import { ProvenanceMarker, provenanceValueClass } from "@/components/ProvenanceMarker";
import { isFallbackMetric } from "@/lib/provenance-utils";
import { metricDelightClass } from "@/lib/metric-delight";
import {
  ProvenanceIndicator,
  StatusBadge,
  badgeToneToVerdict,
} from "@/components/hub";
import { NeutralDivergenceBar } from "@/components/StandoutMetric";

/**
 * CLINICAL MODERN STANDARD: Must use tabular-nums, icon-paired status badges,
 * and sample-gate provenance metadata.
 */
export function MetricBlock({
  icon: Icon,
  iconClassName = "text-zinc-500",
  label,
  value,
  hint,
  badge,
  badgeTone = "neutral",
  provenance,
  valueTone,
  sampleSize,
  source,
  lastUpdated,
  useStatusBadge = true,
}: {
  icon?: LucideIcon;
  iconClassName?: string;
  label: ReactNode;
  value: string;
  hint?: ReactNode;
  badge?: ReactNode;
  badgeTone?: "positive" | "negative" | "neutral" | "warning";
  provenance?: MetricProvenance;
  valueTone?: "positive" | "negative" | "neutral";
  sampleSize?: number;
  source?: string;
  lastUpdated?: string;
  useStatusBadge?: boolean;
}) {
  const hidden = isFallbackMetric(provenance);
  const valueClasses = [
    "font-mono text-xl font-semibold tabular-nums leading-tight",
    provenanceValueClass(provenance) ?? "text-zinc-900",
    valueTone && valueTone !== "neutral"
      ? metricDelightClass(valueTone, "value")
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="clinical-metric-card flex flex-col gap-2 bg-surface px-4 py-4 backdrop-blur-md sm:px-5">
      <div className="clinical-metric-card-head flex flex-wrap items-center gap-x-2 gap-y-1">
        {Icon && (
          <Icon
            className={`size-3.5 shrink-0 ${iconClassName}`}
            strokeWidth={2.25}
            aria-hidden
          />
        )}
        <span className="min-w-0 text-sm font-medium text-zinc-600">{label}</span>
        {!hidden && (
          <>
            <ProvenanceIndicator
              sampleSize={sampleSize}
              source={source}
              lastUpdated={lastUpdated}
              provenance={provenance}
            />
            <ProvenanceMarker provenance={provenance} compact />
          </>
        )}
      </div>
      <p className={valueClasses}>{hidden ? "-" : value}</p>
      {hint && !hidden && (
        <p className="text-sm leading-snug text-primary-muted">{hint}</p>
      )}
      {badge &&
        (typeof badge === "string" &&
        /^balanced$/i.test(badge.trim()) ? (
          <NeutralDivergenceBar className="max-w-[8rem]" />
        ) : useStatusBadge && typeof badge === "string" ? (
          <StatusBadge
            verdict={badgeToneToVerdict(badgeTone)}
            label={badge}
            compact
          />
        ) : (
          <span
            className={`metric-block-badge inline-flex w-fit max-w-full rounded-md px-2 py-0.5 text-sm font-medium tabular-nums ${
              badgeTone === "warning"
                ? "border border-amber-500/35 bg-amber-500/10 text-amber-200"
                : metricDelightClass(badgeTone, "badge")
            }`}
          >
            {badge}
          </span>
        ))}
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

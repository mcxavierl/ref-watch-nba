import type { ReactNode } from "react";
import type { MetricProvenance } from "@/lib/types";
import { ProvenanceIndicator } from "@/components/hub/ProvenanceIndicator";
import { isFallbackMetric } from "@/lib/provenance-utils";
import { metricDelightClass } from "@/lib/metric-delight";

/**
 * CLINICAL MODERN STANDARD: Must use tabular-nums, icon-paired status badges, and sample-gate provenance metadata.
 */
export function StatStrip({ children }: { children: ReactNode }) {
  return <dl className="stat-row">{children}</dl>;
}

export function StatCell({
  label,
  value,
  detail,
  annotation,
  provenance,
  tone,
  standout = false,
  lastUpdated,
  source,
}: {
  label: ReactNode;
  value: string;
  detail?: string;
  annotation?: string;
  provenance?: MetricProvenance;
  tone?: "positive" | "negative" | "neutral" | "standout-high" | "standout-low";
  standout?: boolean;
  lastUpdated?: string;
  source?: string;
}) {
  const hidden = isFallbackMetric(provenance);
  const delightTone = tone ?? "neutral";
  const valueClasses = [
    "stat-value tabular-nums",
    standout || delightTone !== "neutral"
      ? metricDelightClass(
          delightTone === "neutral" && standout ? "positive" : delightTone,
          standout ? "value-hero" : "value",
        )
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="stat-cell">
      <dt className="stat-label">
        {label}
        {provenance && !hidden && (
          <span className="ml-1">
            <ProvenanceIndicator
              provenance={provenance}
              lastUpdated={lastUpdated}
              source={source}
            />
          </span>
        )}
      </dt>
      <dd className={valueClasses}>{hidden ? "-" : value}</dd>
      {detail && !hidden && (
        <dd className="stat-detail text-primary-muted tabular-nums">{detail}</dd>
      )}
      {annotation && <dd className="stat-annotation">{annotation}</dd>}
    </div>
  );
}

export function StatSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-border-subtle py-3 first:border-t-0">
      <p className="section-kicker px-4">{title}</p>
      {children}
    </div>
  );
}

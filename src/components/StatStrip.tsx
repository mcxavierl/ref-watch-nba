import type { ReactNode } from "react";
import type { MetricProvenance } from "@/lib/types";
import { ProvenanceMarker, provenanceValueClass } from "@/components/ProvenanceMarker";
import { isFallbackMetric } from "@/lib/provenance-utils";
import { metricDelightClass } from "@/lib/metric-delight";

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
}: {
  label: ReactNode;
  value: string;
  detail?: string;
  annotation?: string;
  provenance?: MetricProvenance;
  tone?: "positive" | "negative" | "neutral" | "standout-high" | "standout-low";
  standout?: boolean;
}) {
  const hidden = isFallbackMetric(provenance);
  const delightTone = tone ?? "neutral";
  const valueClasses = [
    "stat-value",
    provenanceValueClass(provenance) ?? "",
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
            <ProvenanceMarker provenance={provenance} compact />
          </span>
        )}
      </dt>
      <dd className={valueClasses}>{hidden ? "-" : value}</dd>
      {detail && !hidden && <dd className="stat-detail">{detail}</dd>}
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

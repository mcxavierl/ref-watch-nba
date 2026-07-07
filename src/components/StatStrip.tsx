import type { ReactNode } from "react";
import type { MetricProvenance } from "@/lib/types";
import { ProvenanceMarker, provenanceValueClass } from "@/components/ProvenanceMarker";
import { isFallbackMetric } from "@/lib/provenance-utils";

export function StatStrip({ children }: { children: ReactNode }) {
  return <dl className="stat-row">{children}</dl>;
}

export function StatCell({
  label,
  value,
  detail,
  annotation,
  provenance,
}: {
  label: ReactNode;
  value: string;
  detail?: string;
  annotation?: string;
  provenance?: MetricProvenance;
}) {
  const hidden = isFallbackMetric(provenance);

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
      <dd
        className={`stat-value ${provenanceValueClass(provenance) ?? ""}`.trim()}
      >
        {hidden ? "—" : value}
      </dd>
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

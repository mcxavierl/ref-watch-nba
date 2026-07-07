import type { ReactNode } from "react";
import type { MetricProvenance } from "@/lib/types";
import { isFallbackMetric } from "@/lib/provenance-utils";
import { provenanceValueClass } from "@/components/ProvenanceMarker";

export function RefDashboardStatGrid({ children }: { children: ReactNode }) {
  return <dl className="ref-stat-grid">{children}</dl>;
}

export function RefDashboardStatCell({
  label,
  value,
  detail,
  provenance,
}: {
  label: ReactNode;
  value: string;
  detail?: string;
  provenance?: MetricProvenance;
}) {
  const hidden = isFallbackMetric(provenance);

  return (
    <div className="ref-stat-card">
      <dt className="ref-stat-label">{label}</dt>
      <dd
        className={`ref-stat-value ${provenanceValueClass(provenance) ?? ""}`.trim()}
      >
        {hidden ? "-" : value}
      </dd>
      {detail && !hidden && <dd className="ref-stat-detail">{detail}</dd>}
    </div>
  );
}

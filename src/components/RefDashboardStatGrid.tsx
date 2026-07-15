import type { ReactNode } from "react";
import type { MetricProvenance } from "@/lib/types";
import { isFallbackMetric } from "@/lib/provenance-utils";
import { provenanceValueClass } from "@/components/ProvenanceMarker";
import { ProvenanceIndicator } from "@/components/hub/ProvenanceIndicator";

/**
 * CLINICAL MODERN STANDARD: Must use tabular-nums, icon-paired status badges,
 * and sample-gate provenance metadata.
 */
export function RefDashboardStatGrid({ children }: { children: ReactNode }) {
  return <dl className="ref-stat-grid">{children}</dl>;
}

export function RefDashboardStatCell({
  label,
  value,
  detail,
  detailMuted = false,
  provenance,
  sampleSize,
  source,
  lastUpdated,
}: {
  label: ReactNode;
  value: string;
  detail?: string;
  detailMuted?: boolean;
  provenance?: MetricProvenance;
  sampleSize?: number;
  source?: string;
  lastUpdated?: string;
}) {
  const hidden = isFallbackMetric(provenance);

  return (
    <div className="ref-stat-card clinical-metric-card backdrop-blur-md">
      <div className="clinical-metric-card-head">
        <dt className="ref-stat-label">{label}</dt>
        {!hidden && (
          <ProvenanceIndicator
            sampleSize={sampleSize}
            source={source}
            lastUpdated={lastUpdated}
            provenance={provenance}
          />
        )}
      </div>
      <dd
        className={`ref-stat-value tabular-nums ${provenanceValueClass(provenance) ?? ""}`.trim()}
      >
        {hidden ? "-" : value}
      </dd>
      {detail && !hidden && (
        <dd
          className={
            detailMuted
              ? "ref-stat-detail ref-stat-detail--muted tabular-nums"
              : "ref-stat-detail tabular-nums"
          }
        >
          {detail}
        </dd>
      )}
    </div>
  );
}

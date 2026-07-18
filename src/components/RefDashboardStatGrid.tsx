import type { ReactNode } from "react";
import type { MetricProvenance } from "@/lib/types";
import { isFallbackMetric } from "@/lib/provenance-utils";
import { provenanceValueClass } from "@/components/ProvenanceMarker";
import { ProvenanceIndicator } from "@/components/hub/ProvenanceIndicator";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";

/**
 * CLINICAL MODERN STANDARD: Must use tabular-nums, icon-paired status badges,
 * and sample-gate provenance metadata.
 */
export function RefDashboardStatGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={className ?? "ref-stat-grid"}>{children}</dl>;
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
  valueTooltip,
}: {
  label: ReactNode;
  value: string;
  detail?: string;
  detailMuted?: boolean;
  provenance?: MetricProvenance;
  sampleSize?: number;
  source?: string;
  lastUpdated?: string;
  /** Tooltip explaining the shrunk estimate and raw observed value. */
  valueTooltip?: string;
}) {
  const hidden = isFallbackMetric(provenance);

  const valueNode = (
    <dd
      className={`ref-stat-value font-medium tabular-nums ${provenanceValueClass(provenance) ?? ""}`.trim()}
    >
      {hidden ? "-" : value}
    </dd>
  );

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
      {valueTooltip && !hidden ? (
        <MetricInfoHint hint={valueTooltip}>{valueNode}</MetricInfoHint>
      ) : (
        valueNode
      )}
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

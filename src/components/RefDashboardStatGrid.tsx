import type { ReactNode } from "react";
import type { MetricProvenance } from "@/lib/types";
import { isFallbackMetric } from "@/lib/provenance-utils";
import { provenanceValueClass } from "@/components/ProvenanceMarker";
import { ProvenanceIndicator } from "@/components/hub/ProvenanceIndicator";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import { StatCardShareButton } from "@/components/StatCardShareButton";
import { STAT_CARD_ANCHOR } from "@/lib/stat-card-id";

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
  return <dl className={`stat-data-container ${className ?? "ref-stat-grid"}`.trim()}>{children}</dl>;
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
  shareId,
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
  /** Stable deep-link id; defaults to slugified label when label is a string. */
  shareId?: string;
}) {
  const hidden = isFallbackMetric(provenance);
  const hashId =
    shareId ??
    (typeof label === "string" ? STAT_CARD_ANCHOR.metricLabel(label) : undefined);

  const valueNode = (
    <dd
      className={`ref-stat-value font-medium tabular-nums ${provenanceValueClass(provenance) ?? ""}`.trim()}
    >
      {hidden ? "-" : value}
    </dd>
  );

  return (
    <div
      id={hashId}
      data-stat-card={hashId ? "true" : undefined}
      className="ref-stat-card clinical-metric-card stat-card backdrop-blur-md h-fit flex flex-col"
    >
      <div className="clinical-metric-card-head">
        <dt className="ref-stat-label">{label}</dt>
        <div className="clinical-metric-card-head-actions">
          {!hidden && (
            <ProvenanceIndicator
              sampleSize={sampleSize}
              source={source}
              lastUpdated={lastUpdated}
              provenance={provenance}
            />
          )}
          {hashId ? (
            <StatCardShareButton
              hashId={hashId}
              label={typeof label === "string" ? label : undefined}
            />
          ) : null}
        </div>
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

import type { ReactNode } from "react";
import { ProvenanceIndicator, type ProvenanceIndicatorProps } from "@/components/hub/ProvenanceIndicator";
import { StatCardShareButton } from "@/components/StatCardShareButton";
import { STAT_CARD_ANCHOR } from "@/lib/stat-card-id";

/**
 * CLINICAL MODERN STANDARD: High-accuracy data visualization. All volatility-prone
 * metrics must display maturity indicators and adjusted projections.
 */
export const CLINICAL_METRIC_CARD_CLASS =
  "clinical-metric-card ref-stat-card backdrop-blur-md h-fit flex flex-col";

export function ClinicalMetricCard({
  label,
  value,
  detail,
  detailMuted = false,
  provenance,
  className = "",
  children,
  id,
  shareId,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  detailMuted?: boolean;
  provenance?: ProvenanceIndicatorProps;
  className?: string;
  children?: ReactNode;
  id?: string;
  shareId?: string;
}) {
  const hashId =
    id ??
    shareId ??
    (typeof label === "string" ? STAT_CARD_ANCHOR.metricLabel(label) : undefined);

  return (
    <div
      id={hashId}
      data-stat-card={hashId ? "true" : undefined}
      className={`${CLINICAL_METRIC_CARD_CLASS} stat-card ${className}`.trim()}
    >
      <div className="clinical-metric-card-head">
        <span className="ref-stat-label">{label}</span>
        <div className="clinical-metric-card-head-actions">
          {provenance ? <ProvenanceIndicator {...provenance} /> : null}
          {hashId ? (
            <StatCardShareButton
              hashId={hashId}
              label={typeof label === "string" ? label : undefined}
            />
          ) : null}
        </div>
      </div>
      <p className="ref-stat-value tabular-nums">{value}</p>
      {detail ? (
        <p
          className={
            detailMuted
              ? "ref-stat-detail ref-stat-detail--muted tabular-nums"
              : "ref-stat-detail tabular-nums"
          }
        >
          {detail}
        </p>
      ) : null}
      {children}
    </div>
  );
}

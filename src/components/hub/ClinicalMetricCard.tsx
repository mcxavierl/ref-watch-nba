import type { ReactNode } from "react";
import { ProvenanceIndicator, type ProvenanceIndicatorProps } from "@/components/hub/ProvenanceIndicator";

/**
 * CLINICAL MODERN STANDARD: High-accuracy data visualization. All volatility-prone
 * metrics must display maturity indicators and adjusted projections.
 */
export const CLINICAL_METRIC_CARD_CLASS =
  "clinical-metric-card ref-stat-card backdrop-blur-md";

export function ClinicalMetricCard({
  label,
  value,
  detail,
  detailMuted = false,
  provenance,
  className = "",
  children,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  detailMuted?: boolean;
  provenance?: ProvenanceIndicatorProps;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`${CLINICAL_METRIC_CARD_CLASS} ${className}`.trim()}>
      <div className="clinical-metric-card-head">
        <span className="ref-stat-label">{label}</span>
        {provenance ? <ProvenanceIndicator {...provenance} /> : null}
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

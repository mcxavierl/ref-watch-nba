"use client";

import type { MetricProvenance, SampleGateStatus } from "@/lib/types";
import { isEstimatedTag } from "@/lib/provenance-utils";
import { buildProvenanceTooltipLines } from "@/lib/provenance-tooltip";
import { TouchPopover } from "@/components/ui/TouchPopover";

/**
 * CLINICAL MODERN STANDARD: Must use tabular-nums, icon-paired status badges,
 * and sample-gate provenance metadata.
 */
export interface ProvenanceIndicatorProps {
  sampleSize?: number;
  source?: string;
  lastUpdated?: string;
  provenance?: MetricProvenance;
  gate?: SampleGateStatus;
  compact?: boolean;
  className?: string;
}

export function ProvenanceIndicator({
  sampleSize,
  source,
  lastUpdated,
  provenance,
  gate,
  compact = false,
  className = "",
}: ProvenanceIndicatorProps) {
  const lines = buildProvenanceTooltipLines({
    sampleSize,
    source,
    lastUpdated,
    provenance,
    gate,
  });
  if (lines.length === 0) return null;

  const estimated = provenance ? isEstimatedTag(provenance.tag) : false;
  const indicatorClass = [
    "provenance-indicator",
    compact ? "provenance-indicator--compact" : "",
    estimated ? "provenance-indicator--estimated" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <TouchPopover
      className={indicatorClass}
      panelClassName="provenance-indicator-panel"
      ariaLabel={`Data provenance: ${lines.join(". ")}`}
      trigger={<span className="provenance-indicator-dot" aria-hidden />}
    >
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </TouchPopover>
  );
}

import type { MetricProvenance, SampleGateStatus } from "@/lib/types";
import { isEstimatedTag, provenanceLabel } from "@/lib/provenance-utils";
import { formatSampleCount } from "@/lib/user-language";

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

function formatUpdated(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildTooltipLines({
  sampleSize,
  source,
  lastUpdated,
  provenance,
  gate,
}: ProvenanceIndicatorProps): string[] {
  const lines: string[] = [];
  if (gate) {
    lines.push(gate.label);
  } else if (sampleSize != null && sampleSize > 0) {
    lines.push(`${formatSampleCount(sampleSize)} games`);
  }
  if (source) {
    lines.push(`Verified: ${source}`);
  } else if (provenance?.tag) {
    lines.push(`Verified: ${provenanceLabel(provenance.tag)}`);
  }
  if (provenance?.note) {
    lines.push(provenance.note);
  }
  const updated = formatUpdated(lastUpdated);
  if (updated) {
    lines.push(`Updated ${updated}`);
  }
  return lines;
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
  const lines = buildTooltipLines({
    sampleSize,
    source,
    lastUpdated,
    provenance,
    gate,
  });
  if (lines.length === 0) return null;

  const estimated = provenance ? isEstimatedTag(provenance.tag) : false;

  return (
    <span
      className={`provenance-indicator ${compact ? "provenance-indicator--compact" : ""} ${estimated ? "provenance-indicator--estimated" : ""} ${className}`.trim()}
      tabIndex={0}
      aria-label={`Data provenance: ${lines.join(". ")}`}
      role="note"
    >
      <span className="provenance-indicator-dot" aria-hidden />
      <span className="provenance-indicator-tooltip" aria-hidden>
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </span>
    </span>
  );
}

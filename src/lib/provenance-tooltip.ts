import { provenanceLabel } from "@/lib/provenance-utils";
import { formatSampleCount } from "@/lib/user-language";
import type { MetricProvenance, SampleGateStatus } from "@/lib/types";

export interface ProvenanceTooltipInput {
  sampleSize?: number;
  source?: string;
  lastUpdated?: string;
  provenance?: MetricProvenance;
  gate?: SampleGateStatus;
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

export function buildProvenanceTooltipLines({
  sampleSize,
  source,
  lastUpdated,
  provenance,
  gate,
}: ProvenanceTooltipInput): string[] {
  const lines: string[] = [];
  if (gate) {
    lines.push(gate.label);
  } else if (sampleSize != null && sampleSize > 0) {
    lines.push(formatSampleCount(sampleSize));
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

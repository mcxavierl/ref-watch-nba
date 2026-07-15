import { TermHelp } from "@/components/TermHelp";
import { ProvenanceIndicator } from "@/components/hub/ProvenanceIndicator";
import type { MetricProvenance } from "@/lib/types";
import { isEstimatedTag } from "@/lib/provenance-utils";

export { provenanceValueClass } from "@/lib/provenance-utils";

/**
 * CLINICAL MODERN STANDARD: Must use tabular-nums, icon-paired status badges, and sample-gate provenance metadata.
 *
 * Legacy inline marker for estimated metrics. Prefer ProvenanceIndicator on metric cards.
 */
export function ProvenanceMarker({
  provenance,
  compact = false,
  lastUpdated,
  source,
}: {
  provenance?: MetricProvenance;
  compact?: boolean;
  lastUpdated?: string;
  source?: string;
}) {
  if (!provenance) return null;

  if (isEstimatedTag(provenance.tag)) {
    const label =
      provenance.tag === "fallback-constant" ? "League average" : "Partial data";

    return (
      <span
        className={`inline-flex items-center gap-1 font-normal ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium ring-1 ring-amber-200/80">
          <TermHelp id="provenance-estimated">{label}</TermHelp>
        </span>
        <ProvenanceIndicator
          provenance={provenance}
          lastUpdated={lastUpdated}
          source={source}
        />
      </span>
    );
  }

  return (
    <ProvenanceIndicator
      provenance={provenance}
      lastUpdated={lastUpdated}
      source={source}
    />
  );
}

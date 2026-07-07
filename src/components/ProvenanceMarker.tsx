import { TermHelp } from "@/components/TermHelp";
import type { MetricProvenance } from "@/lib/types";
import { isEstimatedTag } from "@/lib/provenance-utils";

export { provenanceValueClass } from "@/lib/provenance-utils";

export function ProvenanceMarker({
  provenance,
  compact = false,
}: {
  provenance?: MetricProvenance;
  compact?: boolean;
}) {
  if (!provenance || !isEstimatedTag(provenance.tag)) return null;

  const label =
    provenance.tag === "fallback-constant" ? "Estimated" : "Partial data";

  return (
    <span
      className={`inline-flex items-center gap-1 font-normal text-amber-800 ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium ring-1 ring-amber-200/80">
        <TermHelp id="provenance-estimated">{label}</TermHelp>
      </span>
    </span>
  );
}

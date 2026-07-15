import type { SampleGateStatus } from "@/lib/types";
import { StatusBadge } from "@/components/hub/StatusBadge";

/**
 * CLINICAL MODERN STANDARD: Must use tabular-nums, icon-paired status badges,
 * and sample-gate provenance metadata.
 */
export function SampleGateBadge({
  gate,
  className = "",
}: {
  gate?: SampleGateStatus;
  className?: string;
}) {
  if (!gate) return null;

  return (
    <StatusBadge
      verdict={gate.cleared ? "pass" : "caution"}
      label={<span className="tabular-nums">{gate.label}</span>}
      className={className}
      compact
    />
  );
}

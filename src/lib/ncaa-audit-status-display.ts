import type { StatusBadgeVerdict } from "@/components/hub/StatusBadge";

export const NCAA_INTEGRITY_AUDIT_HREF = "/ncaa/integrity-audit";

export type NcaaAuditPendingLabel =
  | "Audit in Progress"
  | "Pending Verification"
  | "Awaiting ingest";

export function formatNcaaAuditPillLabel(coveragePct: number): string {
  const rounded =
    coveragePct % 1 === 0 ? String(Math.round(coveragePct)) : coveragePct.toFixed(1);
  return `Audit: ${rounded}% Complete`;
}

/** Map NCAA pipeline coverage to Clinical Modern status verdicts. */
export function ncaaAuditVerdict(
  coveragePct: number,
  options?: { verified?: boolean; awaitingIngest?: boolean },
): StatusBadgeVerdict {
  if (options?.awaitingIngest || coveragePct <= 0) return "fail";
  if (options?.verified || coveragePct >= 100) return "pass";
  return "caution";
}

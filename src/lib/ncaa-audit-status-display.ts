export const NCAA_INTEGRITY_AUDIT_HREF = "/ncaa/integrity-audit";

export type NcaaAuditPendingLabel = "Audit in Progress" | "Pending Verification";

export function formatNcaaAuditPillLabel(coveragePct: number): string {
  const rounded =
    coveragePct % 1 === 0 ? String(Math.round(coveragePct)) : coveragePct.toFixed(1);
  return `Audit: ${rounded}% Complete`;
}

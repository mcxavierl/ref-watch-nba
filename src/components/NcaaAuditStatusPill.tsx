import type { ReactNode } from "react";
import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { StatusBadge } from "@/components/hub/StatusBadge";
import {
  formatNcaaAuditPillLabel,
  ncaaAuditVerdict,
  type NcaaAuditPendingLabel,
} from "@/lib/ncaa-audit-status-display";

type NcaaAuditStatusPillProps = {
  coveragePct: number;
  auditHref: string;
  pendingLabel?: NcaaAuditPendingLabel;
  className?: string;
  /** When true, render a non-interactive label (parent card supplies the link). */
  asLabel?: boolean;
  /** When true, pipeline checks passed at 100% coverage. */
  verified?: boolean;
};

function auditBadgeLabel(
  coveragePct: number,
  pendingLabel?: NcaaAuditPendingLabel,
): ReactNode {
  return (
    <>
      <span className="tabular-nums">{formatNcaaAuditPillLabel(coveragePct)}</span>
      {pendingLabel ? (
        <span className="ncaa-audit-status-pill-state">{pendingLabel}</span>
      ) : null}
    </>
  );
}

/**
 * CLINICAL MODERN STANDARD: Must use tabular-nums, icon-paired status badges,
 * and sample-gate provenance metadata.
 */
export function NcaaAuditStatusPill({
  coveragePct,
  auditHref,
  pendingLabel,
  className = "",
  asLabel = false,
  verified = false,
}: NcaaAuditStatusPillProps) {
  const awaitingIngest = pendingLabel === "Awaiting ingest";
  const verdict = ncaaAuditVerdict(coveragePct, { verified, awaitingIngest });
  const pillLabel = formatNcaaAuditPillLabel(coveragePct);
  const badge = (
    <StatusBadge
      verdict={verdict}
      label={auditBadgeLabel(coveragePct, pendingLabel)}
      compact
      className={className}
      title={pendingLabel ? `${pillLabel} · ${pendingLabel}` : pillLabel}
    />
  );

  if (asLabel) {
    return (
      <span aria-label={pillLabel} className="inline-flex">
        {badge}
      </span>
    );
  }

  return (
    <Link
      href={auditHref}
      className="rw-focus-ring inline-flex"
      aria-label={`${pillLabel}. Open NCAA data integrity audit.`}
    >
      {badge}
    </Link>
  );
}

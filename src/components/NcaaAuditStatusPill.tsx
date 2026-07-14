import Link from "next/link";
import {
  formatNcaaAuditPillLabel,
  type NcaaAuditPendingLabel,
} from "@/lib/ncaa-audit-status";

type NcaaAuditStatusPillProps = {
  coveragePct: number;
  auditHref: string;
  pendingLabel?: NcaaAuditPendingLabel;
  className?: string;
  /** When true, render a non-interactive label (parent card supplies the link). */
  asLabel?: boolean;
};

export function NcaaAuditStatusPill({
  coveragePct,
  auditHref,
  pendingLabel,
  className = "",
  asLabel = false,
}: NcaaAuditStatusPillProps) {
  const content = (
    <>
      <span className="ncaa-audit-status-pill-label">
        [{formatNcaaAuditPillLabel(coveragePct)}]
      </span>
      {pendingLabel ? (
        <span className="ncaa-audit-status-pill-state">{pendingLabel}</span>
      ) : null}
    </>
  );

  if (asLabel) {
    return (
      <span
        className={`ncaa-audit-status-pill ncaa-audit-status-pill--static ${className}`.trim()}
        aria-label={formatNcaaAuditPillLabel(coveragePct)}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={auditHref}
      className={`ncaa-audit-status-pill rw-focus-ring ${className}`.trim()}
      aria-label={`${formatNcaaAuditPillLabel(coveragePct)}. Open NCAA data integrity audit.`}
    >
      {content}
    </Link>
  );
}

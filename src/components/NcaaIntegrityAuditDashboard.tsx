import Link from "next/link";
import { Clock, ShieldCheck } from "lucide-react";
import { CBB_LEAGUE_ENTRY, CFB_LEAGUE_ENTRY } from "@/config/leagues";
import { NcaaAuditStatusPill } from "@/components/NcaaAuditStatusPill";
import {
  formatNcaaAuditPillLabel,
  NCAA_INTEGRITY_AUDIT_HREF,
  resolveNcaaAuditStatus,
  type NcaaAuditStatus,
} from "@/lib/ncaa-audit-status";
import { LEAGUES } from "@/lib/leagues";

const NCAA_AUDIT_LEAGUES = ["cbb", "cfb"] as const;

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function AuditLeaguePanel({ audit }: { audit: NcaaAuditStatus }) {
  const league = LEAGUES[audit.leagueId];
  const registryEntry = audit.leagueId === "cbb" ? CBB_LEAGUE_ENTRY : CFB_LEAGUE_ENTRY;
  const failures = audit.verification.failures.slice(0, 8);
  const hasIngestedData = audit.totalGames > 0 || audit.totalRefs > 0;
  const pipelineReady = audit.coveragePct >= 100 && audit.failureCount === 0;

  return (
    <section
      id={audit.leagueId}
      className="ncaa-integrity-audit-panel"
      data-league={audit.leagueId}
      aria-labelledby={`ncaa-audit-${audit.leagueId}-heading`}
    >
      <header className="ncaa-integrity-audit-panel-head">
        <div className="ncaa-integrity-audit-panel-title-row">
          <h2 className="ncaa-integrity-audit-panel-title" id={`ncaa-audit-${audit.leagueId}-heading`}>
            {league.label}
          </h2>
          <NcaaAuditStatusPill
            coveragePct={audit.coveragePct}
            auditHref={`${NCAA_INTEGRITY_AUDIT_HREF}#${audit.leagueId}`}
            pendingLabel={hasIngestedData ? audit.pendingLabel : "Awaiting ingest"}
          />
        </div>
        <p className="ncaa-integrity-audit-panel-lead">
          Registry gate: <strong>{registryEntry.dataVerified === true ? "Released" : "Locked"}</strong>
          {" · "}
          Pipeline: <strong>{audit.verified ? "Verified" : "In review"}</strong>
        </p>
      </header>

      <div className="ncaa-integrity-audit-metrics">
        {hasIngestedData ? (
          <>
            <div className="ncaa-integrity-audit-metric">
              <span className="ncaa-integrity-audit-metric-label">Coverage</span>
              <strong className="ncaa-integrity-audit-metric-value">
                {formatNcaaAuditPillLabel(audit.coveragePct).replace("Audit: ", "")}
              </strong>
            </div>
            <div className="ncaa-integrity-audit-metric">
              <span className="ncaa-integrity-audit-metric-label">Games verified</span>
              <strong className="ncaa-integrity-audit-metric-value">
                {formatCount(audit.verifiedGames)} / {formatCount(audit.totalGames)}
              </strong>
            </div>
            <div className="ncaa-integrity-audit-metric">
              <span className="ncaa-integrity-audit-metric-label">Officials verified</span>
              <strong className="ncaa-integrity-audit-metric-value">
                {formatCount(audit.verifiedRefs)} / {formatCount(audit.totalRefs)}
              </strong>
            </div>
            <div className="ncaa-integrity-audit-metric">
              <span className="ncaa-integrity-audit-metric-label">Open failures</span>
              <strong className="ncaa-integrity-audit-metric-value">
                {formatCount(audit.failureCount)}
              </strong>
            </div>
          </>
        ) : (
          <p className="ncaa-integrity-audit-awaiting">
            Ingest has not started for this league yet. Coverage metrics appear once game logs and
            official records are loaded into the pipeline.
          </p>
        )}
      </div>

      {hasIngestedData ? (
        <div className="ncaa-integrity-audit-progress" aria-hidden>
          <span
            className="ncaa-integrity-audit-progress-fill"
            style={{ width: `${Math.min(100, Math.max(0, audit.coveragePct))}%` }}
          />
        </div>
      ) : null}

      {!hasIngestedData ? null : failures.length > 0 ? (
        <div className="ncaa-integrity-audit-failures">
          <h3 className="ncaa-integrity-audit-failures-title">Sample integrity failures</h3>
          <ul className="ncaa-integrity-audit-failure-list">
            {failures.map((failure) => (
              <li key={`${failure.scope}-${failure.id}`} className="ncaa-integrity-audit-failure-item">
                <span className="ncaa-integrity-audit-failure-scope">{failure.scope}</span>
                <span className="ncaa-integrity-audit-failure-id">{failure.id}</span>
                <span className="ncaa-integrity-audit-failure-reason">{failure.reasons[0]}</span>
              </li>
            ))}
          </ul>
          {audit.failureCount > failures.length ? (
            <p className="ncaa-integrity-audit-failures-more">
              +{formatCount(audit.failureCount - failures.length)} additional checks queued
            </p>
          ) : null}
        </div>
      ) : (
        <p className="ncaa-integrity-audit-clear">
          <ShieldCheck aria-hidden className="ncaa-integrity-audit-clear-icon" />
          {pipelineReady
            ? "Pipeline checks passed for all ingested game logs and official records."
            : "No open integrity failures in the current audit sample."}
        </p>
      )}

      <p className="ncaa-integrity-audit-note">
        {registryEntry.dataVerified === true
          ? "Registry released. Hub analytics unlock when pipeline coverage reaches 100%."
          : pipelineReady
            ? "Pipeline verification complete. Awaiting manual registry release before hub analytics unlock."
            : hasIngestedData
              ? `${audit.pendingLabel}. Hub analytics unlock when registry approval and 100% pipeline coverage both pass.`
              : "College hubs stay locked until ingest completes and passes automated verification."}
      </p>
    </section>
  );
}

export function NcaaIntegrityAuditDashboard() {
  const audits = NCAA_AUDIT_LEAGUES.map((leagueId) => resolveNcaaAuditStatus(leagueId));

  return (
    <div className="page-shell">
      <Link href="/" className="back-link">
        ← Multi-league overview
      </Link>

      <section className="page-hero">
        <p className="section-kicker">Data integrity</p>
        <h1 className="page-title">NCAA Data Integrity Audit</h1>
        <p className="page-lead">
          Verification status for college basketball and football ingest. Analytics hubs stay locked
          until registry approval and automated pipeline checks both pass.
        </p>
      </section>

      <div className="data-source-banner data-source-banner--audit-pending" role="status">
        <Clock aria-hidden className="data-source-banner-icon" />
        <p className="data-source-banner-text">
          <strong>College data in review.</strong> NCAA hubs are locked until ingest completes and
          passes automated verification.
        </p>
      </div>

      <div className="ncaa-integrity-audit-grid">
        {audits.map((audit) => (
          <AuditLeaguePanel key={audit.leagueId} audit={audit} />
        ))}
      </div>

      <section className="panel-inset ncaa-integrity-audit-charter">
        <h2 className="section-title">Verification charter</h2>
        <ul className="ncaa-integrity-audit-charter-list">
          <li>Every indexed game log must include officials, scores, and conference mapping.</li>
          <li>Every official profile must reconcile against roster ingest and team-match history.</li>
          <li>Coverage percentage is the minimum of game-log and ref-record pass rates.</li>
          <li>Release requires registry <code>dataVerified: true</code> plus 100% pipeline coverage.</li>
        </ul>
      </section>
    </div>
  );
}

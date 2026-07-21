"use client";

import { useId } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  EvidenceDriver,
  EvidenceImpact,
  ModelContribution,
  ProjectionEvidencePayload,
} from "@/lib/analytics/evidence";
import { SEMANTIC_IMPACT_PILL_CLASS } from "@/lib/semantic-impact";
import "./evidence-drawer.css";

type EvidenceDrawerProps = {
  evidence: ProjectionEvidencePayload;
  open?: boolean;
  onClose?: () => void;
  className?: string;
};

const IMPACT_BADGE_CLASS: Record<EvidenceImpact, string> = {
  HIGH: "evidence-impact-badge evidence-impact-badge--high",
  MEDIUM: "evidence-impact-badge evidence-impact-badge--medium",
  LOW: "evidence-impact-badge evidence-impact-badge--low",
};

const CONTRIBUTION_COLORS: Record<ModelContribution["factor"], string> = {
  Crew: "evidence-contribution-segment--crew",
  Teams: "evidence-contribution-segment--teams",
  "Historical Matchups": "evidence-contribution-segment--history",
  "Rest/Travel": "evidence-contribution-segment--rest",
  Venue: "evidence-contribution-segment--venue",
};

const CONTRIBUTION_LABELS: Record<ModelContribution["factor"], string> = {
  Crew: "Crew Weight",
  Teams: "Team Weight",
  "Historical Matchups": "Matchup History",
  "Rest/Travel": "Rest/Travel",
  Venue: "Venue",
};

function impactLabel(impact: EvidenceImpact): string {
  return impact === "MEDIUM" ? "MED" : impact;
}

function EvidenceMetricTooltip({
  hint,
  children,
}: {
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="evidence-tooltip-trigger">
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

function DriverColumn({
  title,
  tone,
  drivers,
}: {
  title: string;
  tone: "positive" | "negative";
  drivers: EvidenceDriver[];
}) {
  return (
    <section className="evidence-driver-column" aria-label={title}>
      <h3 className="evidence-driver-column-title">{title}</h3>
      {drivers.length === 0 ? (
        <p className="evidence-driver-empty">No measured drivers in this direction.</p>
      ) : (
        <ul className="evidence-driver-list">
          {drivers.map((driver) => (
            <li key={`${driver.feature}-${driver.headline}`}>
              <EvidenceMetricTooltip
                hint={
                  driver.tooltip ??
                  `${driver.detail} Value ${driver.value} vs baseline ${driver.baseline}.`
                }
              >
                <div
                  className={`evidence-driver-card ${SEMANTIC_IMPACT_PILL_CLASS[tone]}`}
                >
                  <div className="evidence-driver-card-head">
                    <span className={IMPACT_BADGE_CLASS[driver.impact]}>
                      {impactLabel(driver.impact)}
                    </span>
                    <span className="evidence-driver-feature">{driver.feature}</span>
                  </div>
                  <p className="evidence-driver-headline">{driver.headline}</p>
                </div>
              </EvidenceMetricTooltip>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ModelContributionBar({
  contributions,
}: {
  contributions: ModelContribution[];
}) {
  return (
    <section className="evidence-contribution" aria-label="Model contribution split">
      <h3 className="evidence-section-title">Model Contribution</h3>
      <div className="evidence-contribution-track" role="img" aria-hidden>
        {contributions.map((row) => (
          <span
            key={row.factor}
            className={`evidence-contribution-segment ${CONTRIBUTION_COLORS[row.factor]}`}
            style={{ width: `${row.percentage}%` }}
            title={`${CONTRIBUTION_LABELS[row.factor]}: ${row.percentage}%`}
          />
        ))}
      </div>
      <ul className="evidence-contribution-legend">
        {contributions.map((row) => (
          <li key={row.factor}>
            <EvidenceMetricTooltip
              hint={`${CONTRIBUTION_LABELS[row.factor]} contributed ${row.percentage}% of the projection weight for this matchup profile.`}
            >
              <span className="evidence-contribution-legend-item">
                <span
                  className={`evidence-contribution-swatch ${CONTRIBUTION_COLORS[row.factor]}`}
                />
                {CONTRIBUTION_LABELS[row.factor]} · {row.percentage}%
              </span>
            </EvidenceMetricTooltip>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EvidenceDrawerBody({ evidence }: { evidence: ProjectionEvidencePayload }) {
  const metric = evidence.metricLabel ?? "Fouls";
  const strengthPct = Math.min(100, (evidence.evidenceStrength / 10) * 100);
  const titleId = useId();

  return (
    <section className="evidence-drawer-card" aria-labelledby={titleId}>
      <header className="evidence-drawer-header">
        <div>
          <p className="evidence-drawer-kicker">Evidence Engine</p>
          <h2 id={titleId} className="evidence-drawer-title">
            Why RefWatch Projects {evidence.projection} {metric}
          </h2>
        </div>
        <div className="evidence-drawer-badges">
          <EvidenceMetricTooltip
            hint={`Evidence Strength blends sample size (>= 15 games), feature agreement, data completeness, and variance. Current score: ${evidence.evidenceStrength} / 10.`}
          >
            <div className="evidence-strength-badge">
              <span className="evidence-strength-label">Evidence Strength</span>
              <strong className="tabular-nums">
                {evidence.evidenceStrength.toFixed(1)} / 10
              </strong>
              <span className="evidence-strength-bar" aria-hidden>
                <span
                  className="evidence-strength-bar-fill"
                  style={{ width: `${strengthPct}%` }}
                />
              </span>
            </div>
          </EvidenceMetricTooltip>
          <EvidenceMetricTooltip
            hint={`Confidence reflects historical model accuracy for similar matchup clusters. Current estimate: ${evidence.confidencePct}%.`}
          >
            <span className="evidence-confidence-badge tabular-nums">
              {evidence.confidencePct}% Confidence
            </span>
          </EvidenceMetricTooltip>
        </div>
      </header>

      <ModelContributionBar contributions={evidence.modelContribution} />

      <div className="evidence-driver-grid">
        <DriverColumn
          title="Factors Increasing Fouls"
          tone="positive"
          drivers={evidence.factorsIncreasing}
        />
        <DriverColumn
          title="Factors Reducing Fouls"
          tone="negative"
          drivers={evidence.factorsReducing}
        />
      </div>
    </section>
  );
}

export function EvidenceDrawer({
  evidence,
  className = "",
}: EvidenceDrawerProps) {
  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={0}>
      <div className={`evidence-drawer ${className}`.trim()}>
        <EvidenceDrawerBody evidence={evidence} />
      </div>
    </TooltipProvider>
  );
}

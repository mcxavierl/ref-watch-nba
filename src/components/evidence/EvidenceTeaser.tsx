"use client";

import type { ProjectionEvidencePayload } from "@/lib/analytics/evidence";
import "./evidence-teaser.css";

type EvidenceTeaserProps = {
  evidence: ProjectionEvidencePayload;
  compact?: boolean;
  className?: string;
};

function strengthBars(score: number): number {
  if (score >= 8.5) return 4;
  if (score >= 6.5) return 3;
  if (score >= 4.5) return 2;
  if (score >= 2.5) return 1;
  return 0;
}

export function EvidenceTeaser({
  evidence,
  compact = false,
  className = "",
}: EvidenceTeaserProps) {
  const filledBars = strengthBars(evidence.evidenceStrength);

  return (
    <div
      className={`evidence-teaser${compact ? " evidence-teaser--compact" : ""} ${className}`.trim()}
      aria-label={`Evidence strength ${evidence.evidenceStrength.toFixed(1)} out of 10, ${evidence.confidencePct} percent confidence`}
    >
      <div className="evidence-teaser-strength">
        <span className="evidence-teaser-strength-label">Evidence</span>
        <span className="evidence-teaser-strength-meter" aria-hidden>
          {Array.from({ length: 4 }, (_, index) => (
            <span
              key={index}
              className={`evidence-teaser-strength-bar${
                index < filledBars ? " evidence-teaser-strength-bar--filled" : ""
              }`}
            />
          ))}
        </span>
        <strong className="evidence-teaser-strength-score tabular-nums">
          {evidence.evidenceStrength.toFixed(1)} / 10
        </strong>
      </div>
      <span className="evidence-teaser-confidence tabular-nums">
        {evidence.confidencePct}% Confidence
      </span>
    </div>
  );
}

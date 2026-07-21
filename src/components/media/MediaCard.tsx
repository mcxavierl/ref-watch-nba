"use client";

import { forwardRef } from "react";
import { WHISTLE_PATHS } from "@/lib/brand-colors";
import type { ProjectionEvidencePayload } from "@/lib/analytics/evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  buildMediaCardContent,
  type MediaCardContent,
} from "@/lib/media/media-card-content";
import "./media-card.css";

export type MediaCardProps = {
  preview: GameSlatePreviewPayload;
  evidence: ProjectionEvidencePayload;
  content?: MediaCardContent;
  className?: string;
};

function statToneClass(headline: string): string {
  if (headline.includes("Above")) return "media-card-stat-headline--positive";
  if (headline.includes("Below")) return "media-card-stat-headline--neutral";
  return "media-card-stat-headline--neutral";
}

export const MediaCard = forwardRef<HTMLDivElement, MediaCardProps>(
  function MediaCard({ preview, evidence, content, className = "" }, ref) {
    const card = content ?? buildMediaCardContent(preview, evidence);
    const { whistleProfile, evidenceSummary } = card;

    return (
      <div
        ref={ref}
        className={`media-card ${className}`.trim()}
        role="img"
        aria-label={`Broadcast graphic for ${whistleProfile.matchup}`}
      >
        <div className="media-card-inner">
          <header className="media-card-header">
            <div className="media-card-brand">
              <div className="media-card-mark" aria-hidden>
                <svg
                  width={34}
                  height={34}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.35}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {WHISTLE_PATHS.map((path) => (
                    <path key={path} d={path} />
                  ))}
                </svg>
              </div>
              <div className="media-card-brand-copy">
                <p className="media-card-kicker">Ref Watch</p>
                <h1 className="media-card-title">Broadcaster Export</h1>
              </div>
            </div>
            <span className="media-card-league-pill">{whistleProfile.leagueLabel}</span>
          </header>

          <div className="media-card-body">
            <section
              className="media-card-panel media-card-panel--profile"
              aria-label="The Whistle Profile"
            >
              <p className="media-card-panel-label">The Whistle Profile</p>
              <h2 className="media-card-official">{whistleProfile.officialName}</h2>
              <p className="media-card-matchup">{whistleProfile.matchup}</p>
              <div className="media-card-stat-block">
                <p
                  className={`media-card-stat-headline ${statToneClass(
                    whistleProfile.keyStatHeadline,
                  )}`}
                >
                  {whistleProfile.keyStatHeadline}
                </p>
                <p className="media-card-stat-detail">{whistleProfile.keyStatDetail}</p>
              </div>
            </section>

            <section className="media-card-panel" aria-label="Evidence Summary">
              <p className="media-card-panel-label">Evidence Summary</p>
              <ol className="media-card-evidence-list">
                {evidenceSummary.bullets.map((bullet, index) => (
                  <li key={`${index}-${bullet}`} className="media-card-evidence-item">
                    <span className="media-card-evidence-index" aria-hidden>
                      {index + 1}
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ol>
              <div className="media-card-evidence-meta">
                <span>{evidenceSummary.confidencePct}% confidence</span>
                <span>
                  {evidenceSummary.evidenceStrength.toFixed(1)} / 10 evidence strength
                </span>
                <span>{evidenceSummary.metricLabel} focus</span>
              </div>
            </section>
          </div>

          <footer className="media-card-footer">
            <span>
              <strong>Ref Watch</strong> officiating intelligence for broadcast partners
            </span>
            <span>Historical tendencies only. Not betting advice.</span>
          </footer>
        </div>
      </div>
    );
  },
);

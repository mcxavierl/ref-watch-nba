"use client";

import { forwardRef } from "react";
import { RefAvatar } from "@/components/RefAvatar";
import { WHISTLE_PATHS } from "@/lib/brand-colors";
import type { ProjectionEvidencePayload } from "@/lib/analytics/evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import {
  buildMediaCardContent,
  type MediaCardContent,
} from "@/lib/media/media-card-content";
import "./media-card.css";

export type MediaCardProps = {
  preview?: GameSlatePreviewPayload;
  evidence?: ProjectionEvidencePayload;
  content?: MediaCardContent;
  className?: string;
};

function heroToneClass(tone: MediaCardContent["heroMetricTone"]): string {
  if (tone === "positive") return "media-card-hero-metric--positive";
  if (tone === "negative") return "media-card-hero-metric--negative";
  return "media-card-hero-metric--neutral";
}

export const MediaCard = forwardRef<HTMLDivElement, MediaCardProps>(
  function MediaCard({ preview, evidence, content, className = "" }, ref) {
    if (!content && (!preview || !evidence)) {
      throw new Error("MediaCard requires content or preview+evidence");
    }

    const card = content ?? buildMediaCardContent(preview!, evidence!);

    return (
      <div
        ref={ref}
        className={`media-card ${className}`.trim()}
        role="img"
        aria-label={`Broadcast graphic for ${card.matchupBadge}`}
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
                <h1 className="media-card-title">Officiating Insight</h1>
              </div>
            </div>
            <div className="media-card-header-badges">
              <span className="media-card-league-pill">{card.leagueLabel}</span>
              <span className="media-card-matchup-pill">{card.matchupBadge}</span>
            </div>
          </header>

          <div className="media-card-hero">
            <p className="media-card-hero-label">Hero Metric</p>
            <p className={`media-card-hero-metric ${heroToneClass(card.heroMetricTone)}`}>
              {card.heroMetric}
            </p>
          </div>

          <div className="media-card-body">
            <section
              className="media-card-panel media-card-panel--profile"
              aria-label="Referee fingerprint and whistle profile"
            >
              <p className="media-card-panel-label">Whistle Profile</p>
              <div className="media-card-profile-row">
                <RefAvatar
                  name={card.primaryRef.name}
                  slug={card.primaryRef.slug}
                  sport={card.primaryRef.sport}
                  size="xl"
                  decorative
                  className="media-card-avatar"
                />
                <div className="media-card-profile-copy">
                  <h2 className="media-card-official">{card.primaryRef.name}</h2>
                  <p className="media-card-crew">{card.crewLabel}</p>
                  <span className="media-card-archetype-tag">{card.archetypeTag}</span>
                </div>
              </div>
              <p className="media-card-stat-detail">
                {card.sampleGames} games in sample · {card.metricLabel} focus
              </p>
            </section>

            <section className="media-card-panel" aria-label="On-air evidence summary">
              <p className="media-card-panel-label">On-Air Evidence Summary</p>
              <ul className="media-card-evidence-list">
                {card.evidenceBullets.map((bullet, index) => (
                  <li key={`${index}-${bullet}`} className="media-card-evidence-item">
                    <span className="media-card-evidence-bullet" aria-hidden>
                      •
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <div className="media-card-evidence-meta">
                <span>{card.confidencePct}% confidence</span>
                <span>
                  {card.evidenceStrength.toFixed(1)} / 10 evidence strength
                </span>
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

"use client";

import { forwardRef } from "react";
import { RefAvatar } from "@/components/RefAvatar";
import { WHISTLE_PATHS } from "@/lib/brand-colors";
import { formatCrewRole, type MediaCardContent } from "@/lib/media/media-card-types";
import "./media-card.css";

export type MediaCardProps = {
  content: MediaCardContent;
  className?: string;
};

function heroToneClass(tone: MediaCardContent["heroMetricTone"]): string {
  if (tone === "positive") return "media-card-hero-metric--positive";
  if (tone === "negative") return "media-card-hero-metric--negative";
  return "media-card-hero-metric--neutral";
}

export const MediaCard = forwardRef<HTMLDivElement, MediaCardProps>(
  function MediaCard({ content, className = "" }, ref) {
    const crewRole = formatCrewRole(content.primaryRef.role);

    return (
      <div
        ref={ref}
        className={`media-card bg-slate-950 border-2 border-slate-800 text-white relative overflow-hidden ${className}`.trim()}
        role="img"
        aria-label={`Broadcast graphic for ${content.matchupBadge}`}
      >
        <div className="media-card-inner p-8">
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
              <p className="media-card-brand-name">RefWatch</p>
            </div>
            <div className="media-card-header-badges">
              <span className="media-card-storyline-badge">Officiating Storyline</span>
              <span className="media-card-matchup-pill">{content.matchupBadge}</span>
            </div>
          </header>

          <div className="media-card-hero">
            <p className={`media-card-hero-metric ${heroToneClass(content.heroMetricTone)}`}>
              {content.heroMetric}
            </p>
          </div>

          <div className="media-card-body">
            <section
              className="media-card-panel media-card-panel--profile"
              aria-label="Referee profile"
            >
              <div className="media-card-profile-pill">
                <RefAvatar
                  name={content.primaryRef.name}
                  slug={content.primaryRef.slug}
                  sport={content.primaryRef.sport}
                  size="xl"
                  decorative
                  className="media-card-avatar"
                />
                <div className="media-card-profile-copy">
                  <h2 className="media-card-official">{content.primaryRef.name}</h2>
                  <p className="media-card-crew">
                    {crewRole ? `${crewRole} · ${content.crewLabel}` : content.crewLabel}
                  </p>
                  <span className="media-card-archetype-tag">{content.archetypeTag}</span>
                </div>
              </div>
            </section>

            <section className="media-card-panel" aria-label="On-air evidence bullets">
              <p className="media-card-panel-label">On-Air Evidence</p>
              <ul className="media-card-evidence-list">
                {content.evidenceBullets.map((bullet, index) => (
                  <li key={`${index}-${bullet}`} className="media-card-evidence-item">
                    <span className="media-card-evidence-bullet" aria-hidden>
                      •
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <footer className="media-card-footer">
            <span>
              <strong>RefWatch</strong> officiating intelligence for broadcast partners
            </span>
            <span>{content.leagueLabel} · Historical tendencies only</span>
          </footer>
        </div>
      </div>
    );
  },
);

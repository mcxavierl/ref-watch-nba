"use client";

import { ArrowRight, Check } from "lucide-react";
import type { IntelligenceCardContent } from "@/lib/intelligence/intelligence-card-types";
import "./intelligence-card.css";

export type IntelligenceCardProps = {
  content: IntelligenceCardContent;
  /** When true, hides the Pro Intelligence preview lock. */
  isPremiumUnlocked?: boolean;
  onViewEvidence?: () => void;
  className?: string;
};

export function IntelligenceCard({
  content,
  isPremiumUnlocked = false,
  onViewEvidence,
  className = "",
}: IntelligenceCardProps) {
  return (
    <article
      className={`intelligence-card ${className}`.trim()}
      aria-label="RefWatch intelligence card"
    >
      <header className="intelligence-card-header">
        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-mono font-semibold">
          <Check size={12} aria-hidden className="shrink-0" />
          RefWatch Verified Analysis
        </span>
        <p className="intelligence-card-proof">{content.proofSubtext}</p>
      </header>

      <h3 className="intelligence-card-section-title">TONIGHT&apos;S OFFICIATING PROFILE</h3>

      <div className="intelligence-card-crew-pill" aria-label="Assigned crew">
        {content.crewPill}
      </div>

      <section className="intelligence-card-signal" aria-label="Primary signal">
        <p className="intelligence-card-signal-label">{content.primarySignalLabel}</p>
        <p className="intelligence-card-signal-body">{content.primarySignalBody}</p>
      </section>

      <p className="intelligence-card-sample">{content.sampleFootnote}</p>

      {!isPremiumUnlocked ? (
        <section
          className="intelligence-card-premium bg-slate-900/80 border border-slate-800 rounded-xl p-3 backdrop-blur-sm relative overflow-hidden"
          aria-label="Pro Intelligence Preview"
        >
          <p className="intelligence-card-premium-kicker">Pro Intelligence Preview</p>
          <p className="intelligence-card-premium-teaser">
            <span aria-hidden>🔒</span> Unlock Drivers: {content.premiumDriverTeaser}
          </p>
          <button
            type="button"
            className="intelligence-card-premium-cta"
            onClick={onViewEvidence}
          >
            View Full Evidence Breakdown
            <ArrowRight size={14} aria-hidden />
          </button>
        </section>
      ) : null}
    </article>
  );
}

import { Activity } from "lucide-react";
import { RESEARCH_HIGHLIGHT } from "@/config/research-highlight";

export function ResearchHighlightPill() {
  return (
    <a
      href={RESEARCH_HIGHLIGHT.href}
      className="overview-research-highlight"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${RESEARCH_HIGHLIGHT.label} ${RESEARCH_HIGHLIGHT.headline}. ${RESEARCH_HIGHLIGHT.cta}`}
    >
      <span className="overview-research-highlight__gradient" aria-hidden />
      <span className="overview-research-highlight__body">
        <span className="overview-research-highlight__icon" aria-hidden>
          <Activity strokeWidth={2.25} />
        </span>
        <span className="overview-research-highlight__copy">
          <span className="overview-research-highlight__label text-sm text-slate-100">
            {RESEARCH_HIGHLIGHT.label}
          </span>
          <span className="overview-research-highlight__headline">
            {RESEARCH_HIGHLIGHT.headline}
          </span>
        </span>
        <span className="overview-research-highlight__cta text-sm text-slate-300">
          {RESEARCH_HIGHLIGHT.cta}
        </span>
      </span>
    </a>
  );
}

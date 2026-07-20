import Link from "next/link";
import { BookOpen } from "lucide-react";
import { RESEARCH_HIGHLIGHT } from "@/config/research-highlight";

export function ResearchHighlightBanner() {
  return (
    <Link
      href={RESEARCH_HIGHLIGHT.href}
      className="research-highlight-banner"
      aria-label={`${RESEARCH_HIGHLIGHT.label} ${RESEARCH_HIGHLIGHT.headline}. ${RESEARCH_HIGHLIGHT.cta}`}
    >
      <span className="research-highlight-banner__inner">
        <BookOpen className="research-highlight-banner__icon" strokeWidth={2.1} aria-hidden />
        <span className="research-highlight-banner__label">{RESEARCH_HIGHLIGHT.label}</span>
        <span className="research-highlight-banner__headline">{RESEARCH_HIGHLIGHT.headline}</span>
        <span className="research-highlight-banner__cta">{RESEARCH_HIGHLIGHT.cta}</span>
      </span>
    </Link>
  );
}

import { BookOpen } from "lucide-react";
import { RESEARCH_HIGHLIGHT } from "@/config/research-highlight";

export function ResearchHighlightBanner() {
  return (
    <a
      href={RESEARCH_HIGHLIGHT.href}
      className="research-highlight-banner group mb-8 flex w-full items-center justify-center rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900/80 px-4 py-3 shadow-inner transition-colors duration-200 hover:from-slate-800/90 hover:via-slate-800/85 hover:to-slate-800/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne-400 sm:px-5 sm:py-3.5"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${RESEARCH_HIGHLIGHT.label} ${RESEARCH_HIGHLIGHT.headline}. ${RESEARCH_HIGHLIGHT.cta}`}
    >
      <span className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center sm:gap-x-2.5">
        <BookOpen
          className="h-4 w-4 shrink-0 text-champagne-500"
          strokeWidth={2.1}
          aria-hidden
        />
        <span className="text-sm text-slate-400">{RESEARCH_HIGHLIGHT.label}</span>
        <span className="text-sm font-semibold text-slate-100">
          {RESEARCH_HIGHLIGHT.headline}
        </span>
        <span className="text-sm font-medium text-champagne-400 transition-colors group-hover:text-champagne-300 sm:ml-3">
          {RESEARCH_HIGHLIGHT.cta}
        </span>
      </span>
    </a>
  );
}

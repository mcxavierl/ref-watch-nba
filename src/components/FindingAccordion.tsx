"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { ConfidenceStrengthIndicator } from "@/components/ConfidenceStrengthIndicator";
import { FindingExplainer } from "@/components/FindingNameWall";
import { StatCell, StatStrip } from "@/components/StatStrip";
import { FindingHighlightBadges } from "@/components/FindingHighlightBadges";
import { findingHighlightMetrics } from "@/lib/finding-highlights";
import type { Finding, FindingLink } from "@/lib/findings-shared";
import {
  FINDING_CATEGORY_LABELS,
  findingConfidenceTier,
  researchFindingHref,
} from "@/lib/findings-shared";

function FindingMetaBadges({
  category,
  index,
  league,
  className = "",
}: {
  category: Finding["category"];
  index: number;
  league?: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB";
  className?: string;
}) {
  return (
    <div className={`finding-accordion-meta-pills ${className}`.trim()}>
      {league && <span className="finding-meta-pill">{league}</span>}
      <span className="finding-meta-pill">
        {FINDING_CATEGORY_LABELS[category]}
      </span>
      <span className="finding-meta-pill finding-meta-pill-muted">
        Finding {index + 1}
      </span>
    </div>
  );
}

export function FindingFooterLinks({ links }: { links: FindingLink[] }) {
  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="finding-footer-link">
          {link.label}
          <ArrowRight className="finding-footer-link-arrow" aria-hidden />
        </Link>
      ))}
    </div>
  );
}

function FindingWhyTeaser({ explainer }: { explainer: string }) {
  return (
    <p className="finding-accordion-teaser finding-accordion-why">
      <span className="finding-accordion-why-label">Why it matters: </span>
      <FindingExplainer text={explainer} />
    </p>
  );
}

export function FindingAccordionItem({
  finding,
  index,
  defaultOpen = false,
  league,
}: {
  finding: Finding;
  index: number;
  defaultOpen?: boolean;
  league?: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB";
}) {
  const tier = findingConfidenceTier(finding);
  const highlights = findingHighlightMetrics(finding);

  return (
    <details className="finding-accordion data-card" open={defaultOpen}>
      <summary className="finding-accordion-trigger">
        <div className="finding-accordion-trigger-inner">
          <div className="finding-accordion-header-row">
            <FindingMetaBadges
              category={finding.category}
              index={index}
              league={league}
            />
            <div className="finding-accordion-header-actions">
              <ConfidenceStrengthIndicator tier={tier} />
              <ChevronDown
                className="finding-accordion-chevron"
                aria-hidden
              />
            </div>
          </div>
          <h3 className="finding-accordion-title">
            <Link
              href={researchFindingHref(finding, league)}
              className="finding-accordion-headline-link hover:text-raptors hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {finding.headline}
            </Link>
          </h3>
          {finding.explainer && (
            <FindingWhyTeaser explainer={finding.explainer} />
          )}
          <FindingHighlightBadges highlights={highlights} />
          <p className="finding-accordion-metric-preview">{finding.summary}</p>
        </div>
      </summary>

      <div className="finding-accordion-panel">
        {finding.stats.length > 0 && (
          <StatStrip>
            {finding.stats.map((stat) => (
              <StatCell
                key={stat.label}
                label={stat.label}
                value={stat.value}
                detail={stat.detail}
              />
            ))}
          </StatStrip>
        )}

        <div className="finding-accordion-footer">
          <p className="text-sm tabular-nums text-zinc-500">
            {finding.sampleNote}
          </p>
          <FindingFooterLinks links={finding.links} />
        </div>
      </div>
    </details>
  );
}

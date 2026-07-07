"use client";

"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { ConfidenceTierBadge } from "@/components/ConfidenceTierBadge";
import { FindingExplainer } from "@/components/FindingNameWall";
import { StatCell, StatStrip } from "@/components/StatStrip";
import type { Finding, FindingLink } from "@/lib/findings-shared";
import {
  FINDING_CATEGORY_LABELS,
  findingConfidenceTier,
} from "@/lib/findings-shared";

function FindingMetaBadges({
  category,
  index,
  league,
}: {
  category: Finding["category"];
  index: number;
  league?: "NBA" | "NHL";
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
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

function FindingSummaryTeaser({ summary }: { summary: string }) {
  return <p className="finding-accordion-teaser">{summary}</p>;
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
  league?: "NBA" | "NHL";
}) {
  const tier = findingConfidenceTier(finding);

  return (
    <details className="finding-accordion data-card" open={defaultOpen}>
      <summary className="finding-accordion-trigger">
        <div className="finding-accordion-trigger-inner">
          <FindingMetaBadges
            category={finding.category}
            index={index}
            league={league}
          />
          <div className="mt-2.5 flex items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug text-zinc-900 sm:text-[1.0625rem]">
              {index + 1}.{" "}
              <Link
                href={`/research/${finding.id}`}
                className="hover:text-raptors hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {finding.headline}
              </Link>
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              <ConfidenceTierBadge tier={tier} />
              <ChevronDown
                className="finding-accordion-chevron"
                aria-hidden
              />
            </div>
          </div>
          <FindingSummaryTeaser summary={finding.summary} />
        </div>
      </summary>

      <div className="finding-accordion-panel">
        {finding.explainer && (
          <p className="finding-accordion-explainer">
            <span className="font-medium text-zinc-800">Why it matters: </span>
            <FindingExplainer text={finding.explainer} />
          </p>
        )}

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

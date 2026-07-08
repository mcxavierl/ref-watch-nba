"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  FindingAccordionChevron,
  FindingContextRow,
  FindingHeaderRow,
  FindingMetricsGrid,
} from "@/components/FindingCardLayout";
import type { Finding, FindingLink } from "@/lib/findings-shared";

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
  return (
    <details className="finding-accordion data-card" open={defaultOpen}>
      <summary className="finding-accordion-trigger">
        <div className="finding-accordion-trigger-inner">
          <FindingHeaderRow
            finding={finding}
            index={index}
            league={league}
            trailing={<FindingAccordionChevron />}
          />
          <FindingMetricsGrid stats={finding.stats} />
          <FindingContextRow explainer={finding.explainer} />
        </div>
      </summary>

      <div className="finding-accordion-panel">
        {finding.summary && (
          <p className="finding-accordion-summary">{finding.summary}</p>
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

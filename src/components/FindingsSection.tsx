import Link from "next/link";
import { Suspense } from "react";
import { SeasonScopeToggle } from "@/components/SeasonScopeToggle";
import { FindingFooterLinks } from "@/components/FindingAccordion";
import { MethodologyLink } from "@/components/MethodologyLink";
import { FindingAccordionItem } from "@/components/FindingAccordion";
import {
  FindingContextRow,
  FindingHeaderRow,
  FindingMetricsGrid,
} from "@/components/FindingCardLayout";
import type { Finding, FindingLeague } from "@/lib/findings-shared";
import {
  filterFindingsByLeague,
  researchHubHref,
  sortFindingsByStrength,
} from "@/lib/findings-shared";

export function FindingCard({
  finding,
  index,
  league,
}: {
  finding: Finding;
  index: number;
  league?: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
}) {
  return (
    <article className="data-card finding-card-static">
      <div className="finding-card-body">
        <FindingHeaderRow finding={finding} index={index} league={league} />
        <FindingMetricsGrid stats={finding.stats} />
        <FindingContextRow explainer={finding.explainer} />
      </div>

      <div className="finding-accordion-footer">
        <p className="finding-sample-meta">{finding.sampleNote}</p>
        {finding.links.length > 0 && (
          <FindingFooterLinks links={finding.links} />
        )}
      </div>
    </article>
  );
}

export function FindingsSection({
  findings,
  compact = false,
  featured = false,
  slateHero = false,
  initialVisibleCount = 4,
  dataSourceNote,
  sortExplainer,
  title = "Dataset findings",
  sectionLead,
  league,
  showScopeToggle = false,
  scopeLabel,
}: {
  findings: Finding[];
  compact?: boolean;
  featured?: boolean;
  slateHero?: boolean;
  initialVisibleCount?: number;
  dataSourceNote?: string;
  sortExplainer?: string;
  title?: string;
  sectionLead?: string;
  league?: FindingLeague;
  showScopeToggle?: boolean;
  scopeLabel?: string;
}) {
  const scopedFindings = sortFindingsByStrength(
    league ? filterFindingsByLeague(findings, league) : findings,
  );

  if (scopedFindings.length === 0) return null;

  const visible = featured
    ? scopedFindings.slice(0, initialVisibleCount)
    : scopedFindings;
  const hidden = featured ? scopedFindings.slice(initialVisibleCount) : [];

  const sectionClass = [
    slateHero ? "slate-findings-hero scroll-mt-24" : "",
    !slateHero && compact && !featured ? "" : !slateHero ? "mb-10 scroll-mt-24" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showHeader = featured || !compact;

  return (
    <section id="dataset-findings" className={sectionClass || undefined}>
      {showHeader && (
        <div className={slateHero ? "slate-findings-hero-intro" : undefined}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className={slateHero ? "slate-findings-hero-title" : "section-title"}>
              {title}
            </h2>
            {showScopeToggle && (
              <Suspense fallback={null}>
                <SeasonScopeToggle />
              </Suspense>
            )}
          </div>
          {scopeLabel && (
            <p className={slateHero ? "slate-findings-hero-note" : "mt-1 text-sm text-zinc-500"}>
              {scopeLabel}
            </p>
          )}
          {slateHero && sectionLead && (
            <p className="slate-findings-hero-lead">{sectionLead}</p>
          )}
          {!slateHero && (
            <p className="section-lead">
              Strong-confidence patterns first, then moderate and thin samples.
              Ranked by effect size within each tier.
            </p>
          )}
          {sortExplainer && (
            <p className={slateHero ? "slate-findings-hero-note" : "mt-2 text-sm text-zinc-500"}>
              {sortExplainer}
            </p>
          )}
          {dataSourceNote && (
            <p className={slateHero ? "slate-findings-hero-note" : "mt-2 text-xs text-zinc-500"}>
              {dataSourceNote}
            </p>
          )}
          <p className={slateHero ? "slate-findings-hero-link" : "mt-3 flex flex-wrap items-center gap-x-4 gap-y-1"}>
            <Link
              href={league ? researchHubHref(league) : "/research"}
              className="text-sm font-semibold text-zinc-800 hover:text-raptors hover:underline"
            >
              View all {league ? `${league} ` : ""}findings →
            </Link>
            <MethodologyLink className="text-sm font-semibold" />
          </p>
        </div>
      )}
      <div
        className={`finding-accordion-stack ${slateHero ? "slate-findings-hero-stack" : compact && !featured ? "" : "mt-4"}`}
      >
        {featured
          ? visible.map((finding, index) => (
              <FindingAccordionItem
                key={finding.id}
                finding={finding}
                index={index}
                defaultOpen={index === 0}
                league={league}
              />
            ))
          : visible.map((finding, index) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                index={index}
                league={league}
              />
            ))}
      </div>
      {hidden.length > 0 && (
        <details className="findings-expand-more">
          <summary className="findings-expand-more-btn">
            {hidden.length} more finding{hidden.length === 1 ? "" : "s"}
          </summary>
          <div className="finding-accordion-stack mt-3">
            {hidden.map((finding, index) => (
              <FindingAccordionItem
                key={finding.id}
                finding={finding}
                index={visible.length + index}
                league={league}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

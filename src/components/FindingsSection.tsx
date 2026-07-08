import Link from "next/link";
import { FindingFooterLinks } from "@/components/FindingAccordion";
import { StatCell, StatStrip } from "@/components/StatStrip";
import { FindingAccordionItem } from "@/components/FindingAccordion";
import type { Finding, FindingLeague } from "@/lib/findings-shared";
import {
  filterFindingsByLeague,
  FINDING_CATEGORY_LABELS,
  researchFindingHref,
  researchHubHref,
} from "@/lib/findings-shared";

export function FindingCard({
  finding,
  index,
  league,
}: {
  finding: Finding;
  index: number;
  league?: "NBA" | "NHL";
}) {
  return (
    <article className="data-card">
      <div className="border-b border-border bg-surface-raised/60 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {league && <span className="finding-meta-pill">{league}</span>}
          <span className="finding-meta-pill">
            {FINDING_CATEGORY_LABELS[finding.category]}
          </span>
          <span className="finding-meta-pill finding-meta-pill-muted">
            Finding {index + 1}
          </span>
        </div>
        <h3 className="mt-2.5 text-base font-semibold leading-snug text-zinc-900 sm:text-[1.125rem]">
          <Link
            href={researchFindingHref(finding, league)}
            className="hover:text-raptors hover:underline"
          >
            {finding.headline}
          </Link>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          {finding.summary}
        </p>
        {finding.explainer && (
          <p className="mt-3 border-t border-border-subtle pt-3 text-sm leading-relaxed text-zinc-600">
            <span className="font-medium text-zinc-800">Why it matters: </span>
            {finding.explainer}
          </p>
        )}
      </div>

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

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border-subtle px-4 py-3">
        <p className="text-sm tabular-nums text-zinc-500">
          {finding.sampleNote}
        </p>
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
  title = "Dataset findings",
  league,
}: {
  findings: Finding[];
  compact?: boolean;
  featured?: boolean;
  slateHero?: boolean;
  initialVisibleCount?: number;
  dataSourceNote?: string;
  title?: string;
  league?: FindingLeague;
}) {
  const scopedFindings = league
    ? filterFindingsByLeague(findings, league)
    : findings;

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
        <>
          <h2 className={slateHero ? "slate-findings-hero-title" : "section-title"}>
            {title}
          </h2>
          {!slateHero && (
            <p className="section-lead">
              Top patterns ranked by effect size and sample size, not tied to
              tonight&apos;s slate.
            </p>
          )}
          {dataSourceNote && (
            <p className={slateHero ? "slate-findings-hero-note" : "mt-2 text-xs text-zinc-500"}>
              {dataSourceNote}
            </p>
          )}
          <p className={slateHero ? "slate-findings-hero-link" : "mt-3"}>
            <Link
              href={league ? researchHubHref(league) : "/research"}
              className="text-sm font-semibold text-zinc-800 hover:text-raptors hover:underline"
            >
              View all {league ? `${league} ` : ""}findings →
            </Link>
          </p>
        </>
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
              <FindingCard key={finding.id} finding={finding} index={index} />
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

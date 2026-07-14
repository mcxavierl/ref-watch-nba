"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { FindingCategoryPillLabel } from "@/components/FindingCategoryPillLabel";
import { FindingExplainer } from "@/components/FindingNameWall";
import { delightValueSize } from "@/components/StandoutMetric";
import type { Finding, FindingLeague, FindingStat } from "@/lib/findings-shared";
import {
  FINDING_CATEGORY_TO_FILTER,
  filterDisplayStats,
  findingConfidenceTier,
  resolveFindingExplainer,
  researchFindingHref,
  researchHubFilterHref,
  researchHubHref,
} from "@/lib/findings-shared";
import { formatFindingCardMeta } from "@/lib/finding-copy";
import {
  findingStatDelightTone,
  isDirectionalTone,
  isStandoutTone,
} from "@/lib/metric-delight";
import type { ConfidenceTier } from "@/lib/user-language";

function AccordionSafeLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      className={className}
      onClick={(event: MouseEvent) => {
        // Links inside <summary> must preventDefault or the accordion steals the click.
        event.preventDefault();
        event.stopPropagation();
        router.push(href);
      }}
    >
      {children}
    </Link>
  );
}

export function FindingMetaBadges({
  finding,
  category,
  categories,
  league,
  className = "",
}: {
  finding?: Finding;
  category?: Finding["category"];
  categories?: Finding["category"][];
  league?: FindingLeague;
  className?: string;
}) {
  const resolvedLeague = league;
  const categoryList =
    categories ??
    (category ? [category] : finding ? [finding.category] : []);
  const detailHref = finding ? researchFindingHref(finding, resolvedLeague) : null;

  return (
    <div className={`finding-meta-pills ${className}`.trim()}>
      {resolvedLeague && (
        <AccordionSafeLink
          href={researchHubHref(resolvedLeague)}
          className="finding-meta-pill finding-meta-pill-link"
        >
          {resolvedLeague}
        </AccordionSafeLink>
      )}
      {categoryList.map((item) => {
        const categoryFilter = FINDING_CATEGORY_TO_FILTER[item];
        return (
          <AccordionSafeLink
            key={item}
            href={
              resolvedLeague
                ? researchHubFilterHref(resolvedLeague, { filter: categoryFilter })
                : detailHref ?? "#"
            }
            className="finding-meta-pill finding-meta-pill-link"
          >
            <FindingCategoryPillLabel category={item} />
          </AccordionSafeLink>
        );
      })}
    </div>
  );
}

export function FindingSampleConfidenceMeta({
  finding,
  sampleNote,
  tier,
  className = "",
}: {
  finding?: Finding;
  sampleNote?: string;
  tier?: ConfidenceTier;
  className?: string;
}) {
  const resolvedTier =
    tier ?? (finding ? findingConfidenceTier(finding) : "Moderate");
  const note = sampleNote ?? finding?.sampleNote ?? "";
  if (!note) return null;
  return (
    <p className={`finding-sample-confidence ${className}`.trim()}>
      {formatFindingCardMeta(note, resolvedTier)}
    </p>
  );
}

export function FindingHeaderRow({
  finding,
  title,
  titleHref,
  categories,
  league,
  trailing,
}: {
  finding?: Finding;
  title?: string;
  titleHref?: string;
  categories?: Finding["category"][];
  league?: FindingLeague;
  trailing?: ReactNode;
}) {
  const resolvedTitle = title ?? finding?.headline ?? "";
  const resolvedHref =
    titleHref ?? (finding ? researchFindingHref(finding, league) : "#");

  return (
    <div className="finding-card-header">
      <h3 className="finding-card-title">
        <AccordionSafeLink
          href={resolvedHref}
          className="finding-card-title-link hover:text-raptors hover:underline"
        >
          {resolvedTitle}
        </AccordionSafeLink>
      </h3>
      <div className="finding-card-header-actions">
        <FindingMetaBadges
          finding={finding}
          categories={categories}
          league={league}
        />
        {finding ? <FindingSampleConfidenceMeta finding={finding} /> : null}
        {trailing}
      </div>
    </div>
  );
}

function metricsGridClass(count: number): string {
  if (count >= 3) return "finding-metrics-grid finding-metrics-grid-3";
  if (count === 2) return "finding-metrics-grid finding-metrics-grid-2";
  return "finding-metrics-grid finding-metrics-grid-1";
}

function metricCellClass(stat: FindingStat, index: number): string {
  const tone = findingStatDelightTone(stat);
  const classes = ["finding-metric-cell"];

  if (tone === "positive" || tone === "standout-high") {
    classes.push("finding-metric-cell--positive");
  } else if (tone === "negative" || tone === "standout-low") {
    classes.push("finding-metric-cell--negative");
  }

  if (isStandoutTone(tone)) {
    classes.push(`finding-metric-cell--${tone}`);
  }

  return classes.join(" ");
}

function metricValueClass(stat: FindingStat, index: number): string {
  const tone = findingStatDelightTone(stat);
  const size = delightValueSize(tone, index);
  const classes = ["finding-metric-value"];

  if (size === "hero") classes.push("finding-metric-value--hero");
  else if (size === "lg") classes.push("finding-metric-value--lg");

  if (isStandoutTone(tone)) {
    classes.push(`finding-metric-value--${tone}`);
  } else if (isDirectionalTone(tone)) {
    classes.push(`finding-metric-value--${tone}`);
  }

  return classes.join(" ");
}

export function FindingMetricsGrid({ stats }: { stats: FindingStat[] }) {
  const displayStats = filterDisplayStats(stats);
  if (displayStats.length === 0) return null;

  return (
    <dl className={metricsGridClass(displayStats.length)} aria-label="Key metrics">
      {displayStats.map((stat, index) => (
        <div key={stat.label} className={metricCellClass(stat, index)}>
          <dd className={metricValueClass(stat, index)}>{stat.value}</dd>
          <dt className="finding-metric-label">{stat.label}</dt>
          {stat.detail && <dd className="finding-metric-detail">{stat.detail}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function FindingContextRow({ explainer }: { explainer?: string }) {
  return (
    <p className="finding-card-context">
      <span className="finding-card-context-label">Why it matters: </span>
      <FindingExplainer text={resolveFindingExplainer(explainer)} />
    </p>
  );
}

export function FindingRegionalContext({ text }: { text?: string }) {
  if (!text) return null;

  return (
    <p className="finding-angle-regional">
      <span className="finding-card-context-label">Regional Context: </span>
      {text}
    </p>
  );
}

export function FindingAccordionChevron() {
  return (
    <ChevronDown className="finding-accordion-chevron" aria-hidden />
  );
}

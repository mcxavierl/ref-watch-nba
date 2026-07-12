"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { FindingExplainer } from "@/components/FindingNameWall";
import { delightValueSize } from "@/components/StandoutMetric";
import type { Finding, FindingLeague, FindingStat } from "@/lib/findings-shared";
import {
  FINDING_CATEGORY_LABELS,
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
  index,
  league,
  className = "",
}: {
  finding: Finding;
  category: Finding["category"];
  index: number;
  league?: FindingLeague;
  className?: string;
}) {
  const resolvedLeague = league;
  const categoryFilter = FINDING_CATEGORY_TO_FILTER[category];
  const detailHref = researchFindingHref(finding, resolvedLeague);

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
      <AccordionSafeLink
        href={
          resolvedLeague
            ? researchHubFilterHref(resolvedLeague, { filter: categoryFilter })
            : detailHref
        }
        className="finding-meta-pill finding-meta-pill-link"
      >
        {FINDING_CATEGORY_LABELS[category]}
      </AccordionSafeLink>
      <AccordionSafeLink
        href={detailHref}
        className="finding-meta-pill finding-meta-pill-muted finding-meta-pill-link"
      >
        Finding {index + 1}
      </AccordionSafeLink>
    </div>
  );
}

export function FindingSampleConfidenceMeta({
  finding,
  className = "",
}: {
  finding: Finding;
  className?: string;
}) {
  const tier = findingConfidenceTier(finding);
  return (
    <p className={`finding-sample-confidence ${className}`.trim()}>
      {formatFindingCardMeta(finding.sampleNote, tier)}
    </p>
  );
}

export function FindingHeaderRow({
  finding,
  index,
  league,
  trailing,
}: {
  finding: Finding;
  index: number;
  league?: FindingLeague;
  trailing?: ReactNode;
}) {
  return (
    <div className="finding-card-header">
      <h3 className="finding-card-title">
        <AccordionSafeLink
          href={researchFindingHref(finding, league)}
          className="finding-card-title-link hover:text-raptors hover:underline"
        >
          {finding.headline}
        </AccordionSafeLink>
      </h3>
      <div className="finding-card-header-actions">
        <FindingMetaBadges
          finding={finding}
          category={finding.category}
          index={index}
          league={league}
        />
        <FindingSampleConfidenceMeta finding={finding} />
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

export function FindingAccordionChevron() {
  return (
    <ChevronDown className="finding-accordion-chevron" aria-hidden />
  );
}

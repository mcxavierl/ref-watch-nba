import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { ConfidenceStrengthIndicator } from "@/components/ConfidenceStrengthIndicator";
import { FindingExplainer } from "@/components/FindingNameWall";
import { delightValueSize } from "@/components/StandoutMetric";
import type { Finding, FindingStat } from "@/lib/findings-shared";
import {
  FINDING_CATEGORY_LABELS,
  findingConfidenceTier,
  researchFindingHref,
} from "@/lib/findings-shared";
import {
  findingStatDelightTone,
  isDirectionalTone,
  isStandoutTone,
} from "@/lib/metric-delight";

export function FindingMetaBadges({
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
    <div className={`finding-meta-pills ${className}`.trim()}>
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

export function FindingHeaderRow({
  finding,
  index,
  league,
  trailing,
}: {
  finding: Finding;
  index: number;
  league?: "NBA" | "NHL" | "NFL" | "EPL" | "CBB" | "CFB";
  trailing?: ReactNode;
}) {
  const tier = findingConfidenceTier(finding);

  return (
    <div className="finding-card-header">
      <h3 className="finding-card-title">
        <Link
          href={researchFindingHref(finding, league)}
          className="finding-card-title-link hover:text-raptors hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {finding.headline}
        </Link>
      </h3>
      <div className="finding-card-header-actions">
        <FindingMetaBadges category={finding.category} index={index} league={league} />
        <ConfidenceStrengthIndicator tier={tier} />
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
  if (stats.length === 0) return null;

  return (
    <dl className={metricsGridClass(stats.length)} aria-label="Key metrics">
      {stats.map((stat, index) => (
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
  if (!explainer) return null;

  return (
    <p className="finding-card-context">
      <span className="finding-card-context-label">Why it matters: </span>
      <FindingExplainer text={explainer} />
    </p>
  );
}

export function FindingAccordionChevron() {
  return (
    <ChevronDown className="finding-accordion-chevron" aria-hidden />
  );
}

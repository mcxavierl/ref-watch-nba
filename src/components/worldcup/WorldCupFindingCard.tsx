import Link from "next/link";
import { FindingCategoryPillLabel } from "@/components/FindingCategoryPillLabel";
import { FindingExplainer } from "@/components/FindingNameWall";
import { dedupeFindingStats } from "@/lib/finding-grouping";
import { findingCardMetaParts } from "@/lib/finding-copy";
import type { Finding, FindingStat } from "@/lib/findings-shared";
import {
  filterDisplayStats,
  findingConfidenceTier,
  resolveFindingExplainer,
} from "@/lib/findings-shared";

const WC_CARD_CLASS =
  "rounded-2xl border border-slate-800 bg-slate-950 p-5 font-[family-name:var(--font-inter)]";

type WcStatPresentation = "name" | "kpi-positive" | "kpi-negative" | "kpi-neutral";

function isNameStat(stat: FindingStat): boolean {
  const label = stat.label.toLowerCase();
  return (
    label.includes("referee") ||
    label === "var" ||
    label.includes("2022 match") ||
    label.includes("last meeting") ||
    label.includes("fifa rank")
  );
}

function worldCupStatPresentation(stat: FindingStat): WcStatPresentation {
  if (isNameStat(stat)) return "name";

  const label = stat.label.toLowerCase();
  const value = stat.value.trim();

  if (
    label.includes("yellow") ||
    label.includes("red") ||
    (label === "cards" && !value.includes("-"))
  ) {
    return "kpi-negative";
  }

  if (label.includes("comeback") || label.includes("extra-time")) {
    const n = Number.parseInt(value, 10);
    return n > 0 ? "kpi-positive" : "kpi-neutral";
  }

  if (label.includes("goals against")) {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) return n <= 4 ? "kpi-positive" : "kpi-negative";
  }

  if (label.includes("record") && /\d+W/.test(value)) {
    return "kpi-positive";
  }

  if (label.includes("goals") && value.includes("-")) {
    const [forGoals, againstGoals] = value.split("-").map((part) => Number.parseInt(part, 10));
    if (Number.isFinite(forGoals) && Number.isFinite(againstGoals)) {
      return forGoals >= againstGoals ? "kpi-positive" : "kpi-negative";
    }
  }

  return "kpi-neutral";
}

function statValueClass(presentation: WcStatPresentation): string {
  const base = "font-bold tabular-nums";
  switch (presentation) {
    case "name":
      return "text-lg font-semibold text-slate-100";
    case "kpi-positive":
      return `${base} text-3xl text-emerald-400`;
    case "kpi-negative":
      return `${base} text-3xl text-rose-400`;
    default:
      return `${base} text-3xl text-slate-100`;
  }
}

function metricsGridClass(count: number): string {
  if (count >= 3) return "grid grid-cols-1 gap-4 sm:grid-cols-3";
  return "grid grid-cols-1 gap-4 sm:grid-cols-2";
}

export function WorldCupFindingCard({ finding }: { finding: Finding }) {
  const displayStats = filterDisplayStats(dedupeFindingStats(finding.stats));
  const tier = findingConfidenceTier(finding);
  const metaParts = findingCardMetaParts(finding.sampleNote, tier);

  return (
    <article className={WC_CARD_CLASS}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="min-w-0 flex-1 text-base font-bold leading-snug text-white">
          {finding.headline}
        </h3>
        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">
          <span
            className="inline-flex max-w-full items-center whitespace-nowrap rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-300"
            data-category={finding.category}
          >
            <FindingCategoryPillLabel category={finding.category} />
          </span>
          <span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-xs font-medium tabular-nums text-slate-400">
            {metaParts.sample}
          </span>
          <span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-xs font-medium text-slate-400">
            {metaParts.maturity}
          </span>
        </div>
      </header>

      {displayStats.length > 0 ? (
        <dl className={`${metricsGridClass(displayStats.length)} mt-4`} aria-label="Key metrics">
          {displayStats.map((stat) => {
            const presentation = worldCupStatPresentation(stat);

            return (
              <div key={stat.label} className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {stat.label}
                </dt>
                <dd className={`mt-1 ${statValueClass(presentation)}`}>{stat.value}</dd>
                {stat.detail ? (
                  <dd className="mt-0.5 text-sm text-slate-400">{stat.detail}</dd>
                ) : null}
              </div>
            );
          })}
        </dl>
      ) : null}

      <p className="mt-4 text-sm font-normal text-slate-400">
        <span className="font-medium text-slate-500">Why it matters: </span>
        <FindingExplainer text={resolveFindingExplainer(finding.explainer)} />
      </p>

      {finding.links.length > 0 ? (
        <footer className="mt-4 flex flex-wrap gap-3 border-t border-slate-800 pt-4">
          {finding.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#BFA86A] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </Link>
          ))}
        </footer>
      ) : null}
    </article>
  );
}

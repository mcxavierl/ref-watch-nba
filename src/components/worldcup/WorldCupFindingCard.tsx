import Link from "next/link";
import { FindingCategoryPillLabel } from "@/components/FindingCategoryPillLabel";
import { FindingExplainer } from "@/components/FindingNameWall";
import { WorldCupKpiValue, worldCupKpiTone } from "@/components/worldcup/WorldCupKpiValue";
import { dedupeFindingStats } from "@/lib/finding-grouping";
import { findingCardMetaParts } from "@/lib/finding-copy";
import type { Finding } from "@/lib/findings-shared";
import {
  filterDisplayStats,
  findingConfidenceTier,
  resolveFindingExplainer,
} from "@/lib/findings-shared";

const WC_CAPSULE =
  "wc-authority-capsule rounded-2xl border border-slate-800 bg-slate-950 p-6 font-[family-name:var(--font-inter)]";

const CONFIDENCE_PILL =
  "wc-authority-pill inline-flex items-center whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium tabular-nums";

function isRefereeCapsule(finding: Finding): boolean {
  return finding.id === "wc-final-referee";
}

export function WorldCupFindingCard({ finding }: { finding: Finding }) {
  const displayStats = filterDisplayStats(dedupeFindingStats(finding.stats));
  const tier = findingConfidenceTier(finding);
  const metaParts = findingCardMetaParts(finding.sampleNote, tier);
  const refereeCapsule = isRefereeCapsule(finding);

  return (
    <article className={`${WC_CAPSULE}${refereeCapsule ? " wc-authority-capsule--referee" : " wc-authority-capsule--kpi"}`}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3
          className={
            refereeCapsule
              ? "wc-authority-value min-w-0 flex-1 text-lg font-semibold leading-snug"
              : "wc-authority-label min-w-0 flex-1 text-sm font-medium leading-snug"
          }
        >
          {refereeCapsule ? finding.headline : finding.headline}
        </h3>
        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">
          <span
            className={`${CONFIDENCE_PILL} font-semibold uppercase tracking-wide`}
            data-category={finding.category}
          >
            <FindingCategoryPillLabel category={finding.category} />
          </span>
          {!refereeCapsule ? (
            <>
              <span className={CONFIDENCE_PILL}>{metaParts.sample}</span>
              <span className={CONFIDENCE_PILL}>{metaParts.maturity}</span>
            </>
          ) : null}
        </div>
      </header>

      {displayStats.length > 0 ? (
        <dl
          className={`mt-5 grid gap-4 ${refereeCapsule ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}
          aria-label="Key metrics"
        >
          {displayStats.map((stat) => {
            const tone = worldCupKpiTone(stat);

            return (
              <div key={stat.label} className="wc-authority-metric-cell min-w-0">
                <dt className="wc-authority-label text-sm font-medium">{stat.label}</dt>
                <dd className="mt-2">
                  <WorldCupKpiValue stat={stat} tone={tone} />
                </dd>
                {stat.detail ? (
                  <dd className="wc-authority-body mt-2 text-base font-normal">{stat.detail}</dd>
                ) : null}
              </div>
            );
          })}
        </dl>
      ) : null}

      <p className="wc-authority-narrative mt-5 border-t border-slate-800 pt-4 text-sm font-normal">
        <span className="wc-authority-label font-medium">Why it matters: </span>
        <FindingExplainer text={resolveFindingExplainer(finding.explainer)} />
      </p>

      {finding.links.length > 0 ? (
        <footer className="mt-4 flex flex-wrap gap-3">
          {finding.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="wc-authority-link text-xs"
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

import Link from "next/link";
import { FindingExplainer } from "@/components/FindingNameWall";
import { WorldCupKpiValue, worldCupKpiTone } from "@/components/worldcup/WorldCupKpiValue";
import { dedupeFindingStats } from "@/lib/finding-grouping";
import type { Finding } from "@/lib/findings-shared";
import {
  filterDisplayStats,
  resolveFindingExplainer,
} from "@/lib/findings-shared";

const WC_CAPSULE =
  "wc-data-capsule rounded-2xl border border-slate-800 bg-slate-950 p-5 font-[family-name:var(--font-inter)]";

function isRefereeCapsule(finding: Finding): boolean {
  return finding.id === "wc-final-referee";
}

export function WorldCupFindingCard({ finding }: { finding: Finding }) {
  const displayStats = filterDisplayStats(dedupeFindingStats(finding.stats));
  const refereeCapsule = isRefereeCapsule(finding);

  return (
    <article
      className={`${WC_CAPSULE}${refereeCapsule ? " wc-data-capsule--referee wc-data-capsule--span-full" : ""}`}
    >
      <header className={refereeCapsule ? "text-center" : undefined}>
        <h3
          className={
            refereeCapsule
              ? "mx-auto max-w-2xl text-base font-semibold leading-snug text-slate-50"
              : "text-sm font-medium leading-snug text-slate-400"
          }
        >
          {finding.headline}
        </h3>
      </header>

      {displayStats.length > 0 ? (
        <dl
          className="wc-data-capsule__body wc-metric-grid wc-metric-grid--2x2"
          aria-label="Key metrics"
        >
          {displayStats.map((stat) => {
            const tone = worldCupKpiTone(stat);

            return (
              <div key={stat.label} className="wc-metric-cell">
                <dt className="wc-data-label">{stat.label}</dt>
                <dd className="mt-1.5">
                  <WorldCupKpiValue stat={stat} tone={tone} />
                </dd>
                {stat.detail ? (
                  <dd className="mt-1 text-sm text-slate-400">{stat.detail}</dd>
                ) : null}
              </div>
            );
          })}
        </dl>
      ) : (
        <div className="wc-data-capsule__body" />
      )}

      <p className="wc-data-capsule__footnote text-base font-normal text-slate-400">
        <span className="wc-data-capsule__footnote-label">Why it matters: </span>
        <FindingExplainer text={resolveFindingExplainer(finding.explainer)} />
      </p>

      {finding.links.length > 0 ? (
        <footer className="flex flex-wrap justify-center gap-3">
          {finding.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-slate-400 hover:text-slate-50 hover:underline"
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

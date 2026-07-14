import Link from "next/link";
import { FindingCategoryPillLabel } from "@/components/FindingCategoryPillLabel";
import { FindingFooterLinks } from "@/components/FindingAccordion";
import { JsonLd } from "@/components/JsonLd";
import { StatCell, StatStrip } from "@/components/StatStrip";
import { getRefStats } from "@/lib/data";
import { getRefStats as getNhlRefStats } from "@/lib/nhl/data";
import {
  researchHubHref,
  resolveFindingExplainer,
} from "@/lib/findings-shared";
import type { ResearchFinding } from "@/lib/research";
import { researchDatasetJsonLd } from "@/lib/syndication";

export function ResearchFindingDetail({
  finding,
}: {
  finding: ResearchFinding;
}) {
  const stats =
    finding.league === "NBA" ? getRefStats() : getNhlRefStats();
  const homeHref = finding.league === "NBA" ? "/" : "/nhl";
  const rankingsHref =
    finding.league === "NBA" ? "/rankings" : "/nhl/rankings";

  return (
    <div className="page-shell">
      <JsonLd
        data={researchDatasetJsonLd(
          finding,
          stats.meta.lastUpdated,
        )}
      />

      <Link href={researchHubHref(finding.league)} className="back-link">
        ← Research hub
      </Link>

      <header className="page-profile-header">
        <div className="hero-headline-stack">
          <p className="section-kicker">
            {finding.league} · <FindingCategoryPillLabel category={finding.category} />
          </p>
          <h1 className="page-title">{finding.headline}</h1>
        </div>
        {finding.explainer && (
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            <span className="font-medium text-zinc-800">Why it matters: </span>
            {resolveFindingExplainer(finding.explainer)}
          </p>
        )}
        <p className="finding-accordion-metric-preview mt-2">{finding.summary}</p>
        <p className="finding-sample-meta mt-3">{finding.sampleNote}</p>
      </header>

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

      {finding.links.length > 0 && (
        <div className="mt-6">
          <FindingFooterLinks links={finding.links} />
        </div>
      )}

      <details className="methodology-details panel-inset mt-10 px-4 py-3 sm:px-5">
        <summary>Methodology</summary>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600">
          <li>
            Findings ranked by effect size × √sample size with category deduplication.
          </li>
          <li>
            Sample gates: 30+ ref games, 8+ team splits, 30+ ATS decisions where
            applicable.
          </li>
          <li>
            Estimated closing lines disclosed where applicable, not betting advice.
          </li>
          <li>
            <Link href="/methodology" className="font-medium text-zinc-800 hover:underline">
              Full methodology →
            </Link>
          </li>
        </ul>
      </details>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link
          href={rankingsHref}
          className="font-medium text-zinc-800 hover:text-raptors hover:underline"
        >
          {finding.league} official tendency index →
        </Link>
        <Link
          href={homeHref}
          className="font-medium text-zinc-800 hover:text-raptors hover:underline"
        >
          Tonight&apos;s {finding.league} games →
        </Link>
      </div>
    </div>
  );
}

export function researchFindingCanonicalPath(
  finding: ResearchFinding,
): string {
  return finding.league === "NHL"
    ? `/nhl/research/${finding.id}`
    : `/research/${finding.id}`;
}

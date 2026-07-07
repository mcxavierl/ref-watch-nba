import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { StatCell, StatStrip } from "@/components/StatStrip";
import { getRefStats } from "@/lib/data";
import { getRefStats as getNhlRefStats } from "@/lib/nhl/data";
import { FINDING_CATEGORY_LABELS } from "@/lib/findings-shared";
import {
  getAllResearchFindingIds,
  getResearchFindingById,
} from "@/lib/research";
import { researchDatasetJsonLd } from "@/lib/syndication";
import { absoluteUrl } from "@/lib/site";

export function generateStaticParams() {
  return getAllResearchFindingIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const finding = getResearchFindingById(id);
  if (!finding) {
    return { title: "Finding not found" };
  }
  return {
    title: finding.headline,
    description: finding.summary,
    alternates: { canonical: absoluteUrl(`/research/${id}`) },
  };
}

export default async function ResearchFindingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const finding = getResearchFindingById(id);
  if (!finding) notFound();

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

      <Link
        href="/research"
        className="back-link"
      >
        ← Research hub
      </Link>

      <header className="mb-6 mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {finding.league} · {FINDING_CATEGORY_LABELS[finding.category]}
        </p>
        <h1 className="mt-2 page-title">
          {finding.headline}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          {finding.summary}
        </p>
        {finding.explainer && (
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            <span className="font-medium text-zinc-800">Why it matters: </span>
            {finding.explainer}
          </p>
        )}
        <p className="mt-3 text-sm tabular-nums text-zinc-500">
          {finding.sampleNote}
        </p>
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
        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
          {finding.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-zinc-800 hover:text-raptors hover:underline"
            >
              {link.label} →
            </Link>
          ))}
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
            Synthetic closing lines disclosed on seeded data — not betting advice.
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
          {finding.league} referee rankings →
        </Link>
        <Link
          href={homeHref}
          className="font-medium text-zinc-800 hover:text-raptors hover:underline"
        >
          Tonight&apos;s {finding.league} slate →
        </Link>
      </div>
    </div>
  );
}

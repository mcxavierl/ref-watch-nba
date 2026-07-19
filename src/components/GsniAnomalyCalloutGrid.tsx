"use client";

import Link from "next/link";
import { HeroHighlightsHeader } from "@/components/dashboard/HeroHighlightsHeader";
import { gsniOfficialRowAnchor } from "@/lib/gsni-research";
import type { RankingsInsight } from "@/lib/rankings-synthesis";

function scrollToGsniRow(refSlug: string) {
  const target = document.getElementById(gsniOfficialRowAnchor(refSlug));
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("gsni-table-row--flash");
  window.setTimeout(() => {
    target.classList.remove("gsni-table-row--flash");
  }, 1600);
}

function GsniAnomalyCalloutCard({
  insight,
  basePath,
}: {
  insight: RankingsInsight;
  basePath: string;
}) {
  const refSlug = insight.refSlug;

  return (
    <article className="gsni-anomaly-callout-card rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="gsni-anomaly-callout-score m-0 tabular-nums text-3xl font-bold tracking-tight text-white">
        {insight.statValue}
      </p>
      <p className="gsni-anomaly-callout-label mt-2 text-sm font-medium leading-snug text-slate-200">
        {insight.body}
      </p>
      {insight.refName && refSlug ? (
        <p className="gsni-anomaly-callout-official mt-3 text-base font-semibold text-white">
          <Link href={`${basePath}/refs/${refSlug}`} className="hover:underline">
            {insight.refName}
          </Link>
        </p>
      ) : null}
      {refSlug ? (
        <button
          type="button"
          className="gsni-anomaly-callout-link mt-4 text-sm font-semibold text-slate-300 underline-offset-2 hover:text-white hover:underline"
          onClick={() => scrollToGsniRow(refSlug)}
        >
          View in table
        </button>
      ) : null}
    </article>
  );
}

export function GsniAnomalyCalloutGrid({
  insights,
  basePath = "",
}: {
  insights: RankingsInsight[];
  basePath?: string;
}) {
  if (insights.length === 0) return null;

  return (
    <div className="hero-highlights-block hero-highlights-block--league hero-highlights-block--insights-hub">
      <HeroHighlightsHeader title="Top highlights" />
      <ul className="rankings-insight-grid gsni-anomaly-callout-grid">
        {insights.map((insight) => (
          <li key={insight.id}>
            <GsniAnomalyCalloutCard insight={insight} basePath={basePath} />
          </li>
        ))}
      </ul>
    </div>
  );
}

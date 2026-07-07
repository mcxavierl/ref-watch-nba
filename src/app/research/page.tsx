import type { Metadata } from "next";
import Link from "next/link";
import { FindingCard } from "@/components/FindingsSection";
import { JsonLd } from "@/components/JsonLd";
import { formatRefStatsRange, getRefStats } from "@/lib/data";
import { formatRefStatsRange as formatNhlRange, getRefStats as getNhlRefStats } from "@/lib/nhl/data";
import { computeAllResearchFindings } from "@/lib/research";
import { researchHubDatasetJsonLd } from "@/lib/syndication";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Research hub — dataset findings",
  description:
    "Ranked historical patterns from NBA and NHL referee datasets. Effect size, sample gates, and plain-language context.",
  alternates: { canonical: absoluteUrl("/research") },
};

export default function ResearchHubPage() {
  const findings = computeAllResearchFindings();
  const nbaStats = getRefStats();
  const nhlStats = getNhlRefStats();
  const lastUpdated = [nbaStats.meta.lastUpdated, nhlStats.meta.lastUpdated]
    .sort()
    .at(-1)!;

  const nbaFindings = findings.filter((f) => f.league === "NBA");
  const nhlFindings = findings.filter((f) => f.league === "NHL");

  return (
    <div className="page-shell">
      <JsonLd data={researchHubDatasetJsonLd(findings.length, lastUpdated)} />

      <Link href="/" className="back-link">
        ← Home
      </Link>

      <section className="page-hero">
        <h1 className="page-title">Research hub</h1>
        <p className="page-lead">
          {findings.length} findings ranked by effect size and sample size across
          NBA ({formatRefStatsRange(nbaStats.meta)}) and NHL (
          {formatNhlRange(nhlStats.meta)}). Descriptive historical tendencies —
          not betting advice.
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          <Link href="/methodology" className="font-medium text-zinc-800 hover:underline">
            How we rank findings →
          </Link>
        </p>
      </section>

      {nbaFindings.length > 0 && (
        <section className="section-block">
          <h2 className="section-title">NBA findings</h2>
          <p className="section-lead">
            {nbaFindings.length} patterns from {nbaStats.refs.length} officials.
          </p>
          <div className="mt-4 space-y-3">
            {nbaFindings.map((finding, index) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                index={index}
                league="NBA"
              />
            ))}
          </div>
        </section>
      )}

      {nhlFindings.length > 0 && (
        <section className="section-block">
          <h2 className="section-title">NHL findings</h2>
          <p className="section-lead">
            {nhlFindings.length} patterns from {nhlStats.refs.length} officials.
          </p>
          <div className="mt-4 space-y-3">
            {nhlFindings.map((finding, index) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                index={index}
                league="NHL"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

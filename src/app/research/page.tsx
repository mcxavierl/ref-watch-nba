import type { Metadata } from "next";
import Link from "next/link";
import { ResearchHubFindings } from "@/components/ResearchHubFindings";
import { JsonLd } from "@/components/JsonLd";
import { formatRefStatsRange, getRefStats } from "@/lib/data";
import { formatRefStatsRange as formatNhlRange, getRefStats as getNhlRefStats } from "@/lib/nhl/data";
import { parseResearchLeagueFilter, filterFindingsByLeague } from "@/lib/findings-shared";
import { computeAllResearchFindings } from "@/lib/research";
import { researchHubDatasetJsonLd } from "@/lib/syndication";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Research hub, dataset findings",
  description:
    "Ranked historical patterns from NBA and NHL referee datasets. Effect size, sample gates, and plain-language context.",
  alternates: { canonical: absoluteUrl("/research") },
};

export default async function ResearchHubPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const { league: leagueParam } = await searchParams;
  const leagueFilter = parseResearchLeagueFilter(leagueParam);
  const findings = computeAllResearchFindings();
  const nbaStats = getRefStats();
  const nhlStats = getNhlRefStats();
  const lastUpdated = [nbaStats.meta.lastUpdated, nhlStats.meta.lastUpdated]
    .sort()
    .at(-1)!;

  const nbaFindings = filterFindingsByLeague(findings, "NBA");
  const nhlFindings = filterFindingsByLeague(findings, "NHL");

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
          {formatNhlRange(nhlStats.meta)}). Descriptive historical tendencies,
          not betting advice.
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          <Link href="/methodology" className="font-medium text-zinc-800 hover:underline">
            How we rank findings →
          </Link>
        </p>
      </section>

      <ResearchHubFindings
        nbaFindings={nbaFindings}
        nhlFindings={nhlFindings}
        nbaRefCount={nbaStats.refs.length}
        nhlRefCount={nhlStats.refs.length}
        defaultLeagueFilter={leagueFilter}
      />
    </div>
  );
}

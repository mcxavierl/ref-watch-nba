import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ResearchHubFindings } from "@/components/ResearchHubFindings";
import { JsonLd } from "@/components/JsonLd";
import { formatRefStatsRange, getRefStats } from "@/lib/cbb/data";
import { computeResearchFindingsForLeague } from "@/lib/research";
import { researchHubDatasetJsonLd } from "@/lib/syndication";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "CBB research hub, dataset findings",
  description:
    "Ranked historical patterns from the CBB referee dataset. Effect size, sample gates, and plain-language context.",
  alternates: { canonical: absoluteUrl("/cbb/research") },
};

export default async function ResearchHubPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const { league: leagueParam } = await searchParams;
  if (leagueParam === "nhl") redirect("/nhl/cbb/research");

  const findings = computeResearchFindingsForLeague("CBB");
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);

  return (
    <div className="page-shell">
      <JsonLd
        data={researchHubDatasetJsonLd(
          "CBB",
          findings.length,
          stats.meta.lastUpdated,
        )}
      />

      <Link href="/cbb" className="back-link">
        ← Home
      </Link>

      <section className="page-hero">
        <h1 className="page-title">CBB research hub</h1>
        <p className="page-lead">
          {findings.length} findings ranked by effect size and sample size across{" "}
          {range}. Descriptive historical tendencies, not betting advice.
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          <Link href="/methodology" className="font-medium text-zinc-800 hover:underline">
            How we rank findings →
          </Link>
        </p>
      </section>

      <ResearchHubFindings
        findings={findings}
        league="CBB"
        refCount={stats.refs.length}
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ResearchHubFindings } from "@/components/ResearchHubFindings";
import { JsonLd } from "@/components/JsonLd";
import { formatRefStatsRange, getRefStats } from "@/lib/nhl/data";
import { computeResearchFindingsForLeague } from "@/lib/research";
import { researchHubDatasetJsonLd } from "@/lib/syndication";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NHL research hub, dataset findings",
  description:
    "Ranked historical patterns from the NHL official dataset. Effect size, sample gates, and plain-language context.",
  alternates: { canonical: absoluteUrl("/nhl/research") },
};

export default function NhlResearchHubPage() {
  const findings = computeResearchFindingsForLeague("NHL");
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);

  return (
    <div className="page-shell">
      <JsonLd
        data={researchHubDatasetJsonLd(
          "NHL",
          findings.length,
          stats.meta.lastUpdated,
        )}
      />

      <Link href="/nhl" className="back-link">
        ← Home
      </Link>

      <section className="page-hero">
        <h1 className="page-title">NHL research hub</h1>
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
        league="NHL"
        refCount={stats.refs.length}
      />
    </div>
  );
}

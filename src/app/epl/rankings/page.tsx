import type { Metadata } from "next";
import Link from "next/link";
import { RankingsInsightCards } from "@/components/RankingsInsightCards";
import { RefRankingsTable } from "@/components/RefRankingsTable";
import {
  formatRefStatsRange,
  getRefStats,
} from "@/lib/epl/data";
import { LEAGUES } from "@/lib/leagues";
import { countNotableSignals } from "@/lib/profile-signals";
import { buildRankingsSynthesis } from "@/lib/rankings-synthesis";
import { isEplSimulatedData } from "@/lib/epl/data-source";
import { absoluteUrl } from "@/lib/site";

import { RANKINGS_PAGE_LEAD, RANKINGS_PAGE_TITLE } from "@/lib/trust-charter";

export const metadata: Metadata = {
  title: "EPL referee tendency index",
  description:
    "Sortable EPL referee tendency index by scoring association, minor penalties, overtime rate, and over-rate vs baseline. Minimum game thresholds, descriptive only.",
  alternates: { canonical: absoluteUrl("/epl/rankings") },
};

export default function EplRankingsPage() {
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const seeded = isEplSimulatedData(stats.meta.source);
  const league = LEAGUES.epl;
  const synthesis = buildRankingsSynthesis(stats, league);
  const signalCounts = Object.fromEntries(
    stats.refs.map((ref) => [
      ref.slug,
      countNotableSignals(ref, stats.meta, "epl"),
    ]),
  );

  return (
    <div className="page-shell">
      <Link href="/epl" className="back-link">
        ← Home
      </Link>

      <section className="page-hero">
        <h1 className="page-title">EPL {RANKINGS_PAGE_TITLE.toLowerCase()}</h1>
        <p className="page-lead">
          {RANKINGS_PAGE_LEAD} Sample: {stats.refs.length} officials ({range}). See{" "}
          <Link href="/methodology" className="font-medium text-zinc-800 hover:underline">
            methodology
          </Link>
          .
        </p>
        {seeded && (
          <p className="mt-2 text-sm text-amber-800">
            Historical dataset, EPL analytics columns show when unavailable.
          </p>
        )}
      </section>

      <RankingsInsightCards synthesis={synthesis} basePath="/epl" />

      <section className="section-block">
        <div className="data-card">
          <RefRankingsTable
            refs={stats.refs}
            league="EPL"
            minSampleSize={stats.meta.minSampleSize}
            overBaseline={stats.meta.leagueOverBaseline}
            basePath="/epl"
            signalCounts={signalCounts}
          />
        </div>
      </section>
    </div>
  );
}

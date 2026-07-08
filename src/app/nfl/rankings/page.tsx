import type { Metadata } from "next";
import Link from "next/link";
import { RankingsInsightCards } from "@/components/RankingsInsightCards";
import { RefRankingsTable } from "@/components/RefRankingsTable";
import {
  formatRefStatsRange,
  getRefStats,
} from "@/lib/nfl/data";
import { LEAGUES } from "@/lib/leagues";
import { countNotableSignals } from "@/lib/profile-signals";
import { buildRankingsSynthesis } from "@/lib/rankings-synthesis";
import { isNflSimulatedData } from "@/lib/nfl/data-source";
import { absoluteUrl } from "@/lib/site";

import { RANKINGS_PAGE_LEAD, RANKINGS_PAGE_TITLE } from "@/lib/trust-charter";

export const metadata: Metadata = {
  title: "NFL official tendency index",
  description:
    "Sortable NFL official tendency index by scoring association, minor penalties, overtime rate, and over-rate vs baseline. Minimum game thresholds, descriptive only.",
  alternates: { canonical: absoluteUrl("/nfl/rankings") },
};

export default function NflRankingsPage() {
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const seeded = isNflSimulatedData(stats.meta.source);
  const league = LEAGUES.nfl;
  const synthesis = buildRankingsSynthesis(stats, league);
  const signalCounts = Object.fromEntries(
    stats.refs.map((ref) => [
      ref.slug,
      countNotableSignals(ref, stats.meta, "nfl"),
    ]),
  );

  return (
    <div className="page-shell">
      <Link href="/nfl" className="back-link">
        ← Home
      </Link>

      <section className="page-hero">
        <h1 className="page-title">NFL {RANKINGS_PAGE_TITLE.toLowerCase()}</h1>
        <p className="page-lead">
          {RANKINGS_PAGE_LEAD} Sample: {stats.refs.length} officials ({range}). See{" "}
          <Link href="/methodology" className="font-medium text-zinc-800 hover:underline">
            methodology
          </Link>
          .
        </p>
        {seeded && (
          <p className="mt-2 text-sm text-amber-800">
            Historical dataset, NFL analytics columns show when unavailable.
          </p>
        )}
      </section>

      <RankingsInsightCards synthesis={synthesis} basePath="/nfl" />

      <section className="section-block">
        <div className="data-card">
          <RefRankingsTable
            refs={stats.refs}
            league="NFL"
            minSampleSize={stats.meta.minSampleSize}
            overBaseline={stats.meta.leagueOverBaseline}
            basePath="/nfl"
            signalCounts={signalCounts}
          />
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { RankingsInsightCards } from "@/components/RankingsInsightCards";
import { RefRankingsTable } from "@/components/RefRankingsTable";
import { formatRefStatsRange, getRefStats } from "@/lib/data";
import { LEAGUES } from "@/lib/leagues";
import { countNotableSignals } from "@/lib/profile-signals";
import { buildRankingsSynthesis } from "@/lib/rankings-synthesis";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "NBA referee rankings",
  description:
    "Sortable NBA referee rankings by historical scoring impact, whistle rate, and over tendency. Minimum game thresholds — descriptive only.",
  alternates: { canonical: absoluteUrl("/rankings") },
};

export default function NbaRankingsPage() {
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const seeded = stats.meta.source === "seeded";
  const league = LEAGUES.nba;
  const synthesis = buildRankingsSynthesis(stats, league);
  const signalCounts = Object.fromEntries(
    stats.refs.map((ref) => [
      ref.slug,
      countNotableSignals(ref, stats.meta, "nba"),
    ]),
  );

  return (
    <div className="page-shell">
      <Link href="/" className="back-link">
        ← Home
      </Link>

      <section className="page-hero">
        <h1 className="page-title">NBA referee rankings</h1>
        <p className="page-lead">
          Historical scoring and whistle tendencies across {stats.refs.length}{" "}
          officials ({range}). Not predictions — see{" "}
          <Link href="/methodology" className="font-medium text-zinc-800 hover:underline">
            methodology
          </Link>
          .
        </p>
        {seeded && (
          <p className="mt-2 text-sm text-amber-800">
            Historical dataset — some metrics use estimated closing lines where
            noted.
          </p>
        )}
      </section>

      <RankingsInsightCards synthesis={synthesis} />

      <section className="section-block">
        <div className="data-card">
          <RefRankingsTable
            refs={stats.refs}
            league="NBA"
            minSampleSize={stats.meta.minSampleSize}
            overBaseline={stats.meta.leagueOverBaseline}
            signalCounts={signalCounts}
          />
        </div>
      </section>
    </div>
  );
}

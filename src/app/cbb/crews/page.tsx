import type { Metadata } from "next";
import Link from "next/link";
import { CrewDominanceTable } from "@/components/CrewDominanceTable";
import {
  computeCrewDominance,
  crewDominanceSummary,
} from "@/lib/crew-dominance";
import { formatRefStatsRange, getRefStats } from "@/lib/cbb/data";
import { LEAGUES } from "@/lib/leagues";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "CBB crew dynamics",
  description:
    "Recurring CBB referee crews ranked by combined scoring pace, whistle rate, and dominance vs members' other assignments. Historical splits only.",
  alternates: { canonical: absoluteUrl("/cbb/crews") },
};

export default function NbaCrewsPage() {
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const seeded = stats.meta.source === "seeded";
  const league = LEAGUES.cbb;
  const entries = computeCrewDominance(stats);

  return (
    <div className="page-shell">
      <Link href="/cbb" className="back-link">
        ← Home
      </Link>

      <section className="page-hero">
        <h1 className="page-title">CBB crew dynamics</h1>
        <p className="page-lead">
          {crewDominanceSummary(entries, "nba")} ({range}). Pace and whistle
          deltas compare each crew to league baselines; dominance compares the
          crew to the same refs in other pairings. Not predictions; see{" "}
          <Link
            href="/methodology"
            className="font-medium text-zinc-800 hover:underline"
          >
            methodology
          </Link>
          .
        </p>
        {seeded && (
          <p className="mt-2 text-sm text-amber-800">
            Historical dataset aggregated from stored team crew splits.
          </p>
        )}
      </section>

      <section className="section-block">
        <div className="data-card">
          <CrewDominanceTable
            entries={entries}
            basePath={league.pathPrefix}
            league="cbb"
            overBaseline={stats.meta.leagueOverBaseline}
            leagueAvgFouls={stats.meta.leagueAvgFouls}
          />
        </div>
      </section>

      <section className="section-block">
        <h2 className="section-title">Related views</h2>
        <p className="section-lead">
          Cross-tab ref×team records or drill into tight-game proxies on ref
          profiles.
        </p>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
          <li>
            <Link
              href="/cbb/matrix"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Ref × team matrix →
            </Link>
          </li>
          <li>
            <Link
              href="/cbb/refs"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Ref profiles (tight-game proxy) →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { CrewDominanceTable } from "@/components/CrewDominanceTable";
import {
  computeCrewDominance,
  crewDominanceSummary,
} from "@/lib/crew-dominance";
import { formatRefStatsRange, getRefStats } from "@/lib/epl/data";
import { LEAGUES } from "@/lib/leagues";
import { absoluteUrl } from "@/lib/site";
import { isEplSimulatedData } from "@/lib/epl/data-source";

export const metadata: Metadata = {
  title: "EPL crew dynamics",
  description:
    "Recurring EPL officiating crews ranked by combined scoring pace, penalty rate, and dominance vs members' other assignments. Historical splits only.",
  alternates: { canonical: absoluteUrl("/epl/crews") },
};

export default function EplCrewsPage() {
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const seeded = isEplSimulatedData(stats.meta.source);
  const espn = stats.meta.source === "espn";
  const league = LEAGUES.epl;
  const entries = computeCrewDominance(stats);

  return (
    <div className="page-shell">
      <Link href="/epl" className="back-link">
        ← EPL matchday
      </Link>

      <section className="page-hero">
        <h1 className="page-title">EPL crew dynamics</h1>
        <p className="page-lead">
          {crewDominanceSummary(entries, "epl")} ({range}). Pace and penalty
          deltas compare each crew to league baselines; dominance compares the
          crew to the same officials in other pairings. Not predictions; see{" "}
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
            Simulated seed dataset aggregated from stored team crew splits.
          </p>
        )}
        {espn && (
          <p className="mt-2 text-sm text-emerald-800">
            Penalty and scoring stats sourced from ESPN game summaries.
          </p>
        )}
      </section>

      <section className="section-block">
        <div className="data-card">
          <CrewDominanceTable
            entries={entries}
            basePath={league.pathPrefix}
            league="epl"
            overBaseline={stats.meta.leagueOverBaseline}
            leagueAvgFouls={stats.meta.leagueAvgFouls}
          />
        </div>
      </section>

      <section className="section-block">
        <h2 className="section-title">Related views</h2>
        <p className="section-lead">
          Cross-tab official×team records or drill into late-game proxies on
          official profiles.
        </p>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
          <li>
            <Link
              href="/epl/matrix"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Official × team matrix →
            </Link>
          </li>
          <li>
            <Link
              href="/epl/refs"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Official profiles (late-game proxy) →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

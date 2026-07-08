import type { Metadata } from "next";
import Link from "next/link";
import { CrewDominanceTable } from "@/components/CrewDominanceTable";
import {
  computeCrewDominance,
  crewDominanceSummary,
} from "@/lib/crew-dominance";
import { formatRefStatsRange, getRefStats } from "@/lib/cfb/data";
import { LEAGUES } from "@/lib/leagues";
import { absoluteUrl } from "@/lib/site";
import { isCfbSimulatedData } from "@/lib/cfb/data-source";

export const metadata: Metadata = {
  title: "CFB crew dynamics",
  description:
    "Recurring CFB officiating crews ranked by combined scoring pace, penalty rate, and dominance vs members' other assignments. Historical splits only.",
  alternates: { canonical: absoluteUrl("/cfb/crews") },
};

export default function CfbCrewsPage() {
  const stats = getRefStats();
  const range = formatRefStatsRange(stats.meta);
  const seeded = isCfbSimulatedData(stats.meta.source);
  const espn = stats.meta.source === "espn";
  const league = LEAGUES.cfb;
  const entries = computeCrewDominance(stats);

  return (
    <div className="page-shell">
      <Link href="/cfb" className="back-link">
        ← CFB slate
      </Link>

      <section className="page-hero">
        <h1 className="page-title">CFB crew dynamics</h1>
        <p className="page-lead">
          {crewDominanceSummary(entries, "cfb")} ({range}). Pace and penalty
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
            league="cfb"
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
              href="/cfb/matrix"
              className="text-zinc-800 hover:text-raptors hover:underline"
            >
              Official × team matrix →
            </Link>
          </li>
          <li>
            <Link
              href="/cfb/refs"
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
